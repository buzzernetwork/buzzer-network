/**
 * Privacy Management Routes
 * GDPR/CCPA compliance endpoints for user privacy rights
 */

import { Router, Request, Response } from 'express';
import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';
import crypto from 'crypto';
import { logger } from '../config/logger.js';

const router = Router();
const privacyLogger = logger.child({ component: 'privacy' });

/**
 * Generate user identifier from IP + User Agent
 */
function generateUserIdentifier(req: Request): string {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
}

/**
 * Extract IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }
  
  return req.ip || '127.0.0.1';
}

/**
 * POST /api/v1/privacy/opt-out
 * User opt-out from tracking (GDPR/CCPA right to object)
 * 
 * Body:
 * - identifier: Optional custom identifier (otherwise uses IP+UA hash)
 * - source: 'user_request', 'gdpr', or 'ccpa'
 * - duration_days: Optional duration for temporary opt-out
 */
router.post('/opt-out', async (req: Request, res: Response) => {
  try {
    const { identifier, source, duration_days } = req.body;
    
    // Use provided identifier or generate from request
    const userIdentifier = identifier || generateUserIdentifier(req);
    
    // Calculate expiration if temporary
    const expiresAt = duration_days 
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000)
      : null;
    
    // Insert opt-out record
    await dbPool.query(
      `INSERT INTO privacy_opt_outs (identifier, source, expires_at, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (identifier) DO UPDATE
       SET opted_out_at = NOW(), source = $2, expires_at = $3, metadata = $4`,
      [
        userIdentifier,
        source || 'user_request',
        expiresAt,
        JSON.stringify({ ip: getClientIP(req), user_agent: req.headers['user-agent'] }),
      ]
    );
    
    // Update cache
    await cache.set(`opt-out:${userIdentifier}`, true, duration_days ? duration_days * 86400 : 31536000); // 1 year default
    
    privacyLogger.info('User opted out', {
      identifier: userIdentifier.substring(0, 8),
      source: source || 'user_request',
      duration_days,
    });
    
    res.status(200).json({
      success: true,
      message: 'Successfully opted out of tracking',
      identifier: userIdentifier.substring(0, 8), // Return truncated identifier for confirmation
    });
  } catch (error) {
    privacyLogger.error('Opt-out error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/privacy/data/:identifier
 * Access user data (GDPR right to access)
 * 
 * Returns all tracking data associated with the identifier
 */
router.get('/data/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    // Use provided identifier or generate from request
    const userIdentifier = identifier === 'me' ? generateUserIdentifier(req) : identifier;
    
    // Get impressions
    const impressionsResult = await dbPool.query(
      `SELECT id, campaign_id, publisher_id, slot_id, timestamp, geo, device, 
              revenue, fraud_status, consent_given, privacy_mode
       FROM impressions
       WHERE session_id IN (
         SELECT DISTINCT session_id FROM impressions 
         WHERE ip_address::text LIKE $1 OR session_id LIKE $1
         LIMIT 100
       )
       ORDER BY timestamp DESC
       LIMIT 1000`,
      [`%${userIdentifier}%`]
    );
    
    // Get clicks
    const clicksResult = await dbPool.query(
      `SELECT id, campaign_id, publisher_id, slot_id, timestamp, geo, device,
              revenue, fraud_status, consent_given, privacy_mode, converted
       FROM clicks
       WHERE session_id IN (
         SELECT DISTINCT session_id FROM clicks
         WHERE ip_address::text LIKE $1 OR session_id LIKE $1
         LIMIT 100
       )
       ORDER BY timestamp DESC
       LIMIT 1000`,
      [`%${userIdentifier}%`]
    );
    
    // Get conversions
    const conversionsResult = await dbPool.query(
      `SELECT id, campaign_id, publisher_id, timestamp, conversion_type,
              conversion_value, attributed_within_window, time_to_conversion_seconds
       FROM conversions
       WHERE impression_id IN (
         SELECT ad_id FROM clicks
         WHERE session_id IN (
           SELECT DISTINCT session_id FROM clicks
           WHERE ip_address::text LIKE $1 OR session_id LIKE $1
           LIMIT 100
         )
       )
       ORDER BY timestamp DESC
       LIMIT 1000`,
      [`%${userIdentifier}%`]
    );
    
    privacyLogger.info('Data access request', {
      identifier: userIdentifier.substring(0, 8),
      impressions_count: impressionsResult.rows.length,
      clicks_count: clicksResult.rows.length,
      conversions_count: conversionsResult.rows.length,
    });
    
    res.status(200).json({
      success: true,
      data: {
        impressions: impressionsResult.rows,
        clicks: clicksResult.rows,
        conversions: conversionsResult.rows,
        summary: {
          total_impressions: impressionsResult.rows.length,
          total_clicks: clicksResult.rows.length,
          total_conversions: conversionsResult.rows.length,
        },
      },
    });
  } catch (error) {
    privacyLogger.error('Data access error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/v1/privacy/data/:identifier
 * Delete user data (GDPR right to erasure / "right to be forgotten")
 * 
 * Anonymizes user data by removing PII fields
 */
router.delete('/data/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    // Use provided identifier or generate from request
    const userIdentifier = identifier === 'me' ? generateUserIdentifier(req) : identifier;
    
    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Anonymize impressions (remove PII but keep aggregate data)
      const impressionsResult = await client.query(
        `UPDATE impressions
         SET ip_address = NULL,
             user_agent = NULL,
             session_id = NULL,
             referer = NULL,
             page_url = NULL,
             cache_buster = NULL
         WHERE session_id IN (
           SELECT DISTINCT session_id FROM impressions
           WHERE ip_address::text LIKE $1 OR session_id LIKE $1
         )`,
        [`%${userIdentifier}%`]
      );
      
      // Anonymize clicks
      const clicksResult = await client.query(
        `UPDATE clicks
         SET ip_address = NULL,
             user_agent = NULL,
             session_id = NULL,
             referer = NULL,
             page_url = NULL,
             cache_buster = NULL
         WHERE session_id IN (
           SELECT DISTINCT session_id FROM clicks
           WHERE ip_address::text LIKE $1 OR session_id LIKE $1
         )`,
        [`%${userIdentifier}%`]
      );
      
      // Anonymize conversions
      const conversionsResult = await client.query(
        `UPDATE conversions
         SET ip_address = NULL,
             user_agent = NULL,
             referer = NULL,
             page_url = NULL
         WHERE impression_id IN (
           SELECT ad_id FROM clicks
           WHERE session_id IN (
             SELECT DISTINCT session_id FROM clicks
             WHERE ip_address::text LIKE $1 OR session_id LIKE $1
           )
         )`,
        [`%${userIdentifier}%`]
      );
      
      await client.query('COMMIT');
      
      // Clear cache entries
      await cache.del(`opt-out:${userIdentifier}`);
      
      const totalAnonymized = 
        (impressionsResult.rowCount || 0) +
        (clicksResult.rowCount || 0) +
        (conversionsResult.rowCount || 0);
      
      privacyLogger.info('Data deletion request processed', {
        identifier: userIdentifier.substring(0, 8),
        records_anonymized: totalAnonymized,
      });
      
      res.status(200).json({
        success: true,
        message: 'Personal data has been anonymized',
        records_anonymized: totalAnonymized,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    privacyLogger.error('Data deletion error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/privacy/status
 * Check current privacy status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userIdentifier = generateUserIdentifier(req);
    
    // Check opt-out status
    const optOutResult = await dbPool.query(
      `SELECT opted_out_at, expires_at, source
       FROM privacy_opt_outs
       WHERE identifier = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userIdentifier]
    );
    
    const isOptedOut = optOutResult.rows.length > 0;
    
    res.status(200).json({
      success: true,
      identifier: userIdentifier.substring(0, 8),
      opted_out: isOptedOut,
      opted_out_since: isOptedOut ? optOutResult.rows[0].opted_out_at : null,
      opt_out_source: isOptedOut ? optOutResult.rows[0].source : null,
    });
  } catch (error) {
    privacyLogger.error('Status check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

