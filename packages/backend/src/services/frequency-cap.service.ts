/**
 * Frequency Capping Service
 * Prevents users from seeing the same ad too many times
 * Uses privacy-preserving fingerprinting (IP + User-Agent hash)
 */

import { cache } from '../config/redis.js';
import crypto from 'crypto';
import { Request } from 'express';
import { extractClientIP } from './geo-ip.service.js';

/**
 * Generate privacy-preserving user fingerprint
 * Uses SHA256 hash of IP + User-Agent to avoid storing PII
 */
function getUserFingerprint(req: Request): string {
  const ip = extractClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  // SHA256 hash for privacy
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
}

/**
 * Check if user has exceeded frequency cap for a campaign
 * @param req Express request object
 * @param campaignId Campaign UUID
 * @param maxImpressions Maximum impressions per day (default: 3)
 * @returns true if allowed, false if cap exceeded
 */
export async function checkFrequencyCap(
  req: Request,
  campaignId: string,
  maxImpressions: number = 3
): Promise<boolean> {
  const fingerprint = getUserFingerprint(req);
  const key = `freq:${campaignId}:${fingerprint}`;
  
  const count = await cache.get<number>(key);
  if (count && count >= maxImpressions) {
    return false; // Cap exceeded
  }
  
  return true; // Allow impression
}

/**
 * Increment frequency counter for a user and campaign
 * Counter expires after 24 hours
 * @param req Express request object
 * @param campaignId Campaign UUID
 */
export async function incrementFrequency(
  req: Request,
  campaignId: string
): Promise<void> {
  const fingerprint = getUserFingerprint(req);
  const key = `freq:${campaignId}:${fingerprint}`;
  const ttl = 86400; // 24 hours
  
  const current = (await cache.get<number>(key)) || 0;
  await cache.set(key, current + 1, ttl);
}

/**
 * Get current frequency count for a user and campaign
 * @param req Express request object
 * @param campaignId Campaign UUID
 * @returns Current impression count
 */
export async function getFrequencyCount(
  req: Request,
  campaignId: string
): Promise<number> {
  const fingerprint = getUserFingerprint(req);
  const key = `freq:${campaignId}:${fingerprint}`;
  
  return (await cache.get<number>(key)) || 0;
}

