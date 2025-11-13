/**
 * Segmentation Service
 * Privacy-preserving behavioral targeting and retargeting
 */

import { Request } from 'express';
import crypto from 'crypto';
import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';

const SEGMENT_CACHE_TTL = 86400; // 24 hours

/**
 * Generate privacy-preserving user fingerprint
 * Uses SHA256 hash of IP + User-Agent
 */
function getUserFingerprint(req: Request): string {
  const ip = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';
  
  // SHA256 hash for privacy
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');
}

/**
 * Get user segments from database
 * @param hashedUserId - SHA256 hash of user identifier
 * @returns Array of segment IDs
 */
async function getUserSegmentsFromDB(hashedUserId: string): Promise<string[]> {
  try {
    const result = await dbPool.query(
      `SELECT segment_id FROM user_segments 
       WHERE hashed_user_id = $1 
       AND expires_at > NOW()`,
      [hashedUserId]
    );
    
    return result.rows.map(row => row.segment_id);
  } catch (error) {
    console.error('Get user segments error:', error);
    return [];
  }
}

/**
 * Get user segments (cached)
 * @param req - Express request object
 * @returns Array of segment IDs
 */
export async function getUserSegments(req: Request): Promise<string[]> {
  const fingerprint = getUserFingerprint(req);
  const cacheKey = `segments:${fingerprint}`;
  
  // Check cache first
  const cached = await cache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const segments = await getUserSegmentsFromDB(fingerprint);
  
  // Cache for 24 hours
  await cache.set(cacheKey, segments, SEGMENT_CACHE_TTL);
  
  return segments;
}

/**
 * Add user to a segment
 * @param hashedUserId - SHA256 hash of user identifier
 * @param segmentId - Segment identifier
 * @param ttlDays - Time to live in days (default: 30)
 */
export async function addUserToSegment(
  hashedUserId: string,
  segmentId: string,
  ttlDays: number = 30
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    
    await dbPool.query(
      `INSERT INTO user_segments (hashed_user_id, segment_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (hashed_user_id, segment_id) 
       DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [hashedUserId, segmentId, expiresAt]
    );
    
    // Invalidate cache
    await cache.del(`segments:${hashedUserId}`);
  } catch (error) {
    console.error('Add user to segment error:', error);
  }
}

/**
 * Add user to segment from request
 * @param req - Express request object
 * @param segmentId - Segment identifier
 * @param ttlDays - Time to live in days
 */
export async function addUserToSegmentFromRequest(
  req: Request,
  segmentId: string,
  ttlDays: number = 30
): Promise<void> {
  const fingerprint = getUserFingerprint(req);
  await addUserToSegment(fingerprint, segmentId, ttlDays);
}

/**
 * Get target segments for a campaign
 * @param campaignId - Campaign UUID
 * @returns Array of target segment IDs
 */
export async function getCampaignTargetSegments(
  campaignId: string
): Promise<string[]> {
  const cacheKey = `campaign_segments:${campaignId}`;
  
  // Check cache
  const cached = await cache.get<string[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const result = await dbPool.query(
      'SELECT segment_id FROM campaign_target_segments WHERE campaign_id = $1',
      [campaignId]
    );
    
    const segments = result.rows.map(row => row.segment_id);
    
    // Cache for 1 hour
    await cache.set(cacheKey, segments, 3600);
    
    return segments;
  } catch (error) {
    console.error('Get campaign segments error:', error);
    return [];
  }
}

/**
 * Check if user matches campaign's target segments
 * @param userSegments - User's segments
 * @param campaignSegments - Campaign's target segments
 * @returns true if user matches (or no targeting), false otherwise
 */
export function matchesTargetSegments(
  userSegments: string[],
  campaignSegments: string[]
): boolean {
  // If campaign has no segment targeting, match all users
  if (campaignSegments.length === 0) {
    return true;
  }
  
  // Check if user has ANY of the target segments
  return campaignSegments.some(segment => userSegments.includes(segment));
}

/**
 * Cleanup expired segments (should be run as cron job)
 */
export async function cleanupExpiredSegments(): Promise<number> {
  try {
    const result = await dbPool.query(
      'DELETE FROM user_segments WHERE expires_at < NOW() RETURNING id'
    );
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Cleanup expired segments error:', error);
    return 0;
  }
}

/**
 * Invalidate campaign segments cache
 */
export async function invalidateCampaignSegmentsCache(
  campaignId: string
): Promise<void> {
  await cache.del(`campaign_segments:${campaignId}`);
}

