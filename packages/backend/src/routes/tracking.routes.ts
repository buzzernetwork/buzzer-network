/**
 * Tracking Routes
 * Impression and click tracking endpoints
 */

import { Router, Request } from 'express';
import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';
import * as pixalate from '../services/pixalate.service.js';
import { trackingRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { trackingLogger, fraudLogger } from '../config/logger.js';
import { incrementFrequency } from '../services/frequency-cap.service.js';
import { incrementHourlySpend } from '../services/budget-pacing.service.js';
import { getOrCreateSessionId } from '../services/session.service.js';
import { isGIVT } from '../services/givt-filter.service.js';
import { trackConversion, conversionExists } from '../services/conversion-tracking.service.js';

const router = Router();

/**
 * Extract IP address from request
 */
function getClientIP(req: Request): string {
  // Try x-forwarded-for first (common in production behind proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  
  // Try x-real-ip header
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }
  
  // Fall back to req.ip
  return req.ip || '127.0.0.1';
}

/**
 * Determine if this request should be fraud-checked (sampling)
 * For impressions: 10-15% sampling
 * For clicks: 100% (always check)
 */
async function shouldCheckFraud(isClick: boolean = false): Promise<boolean> {
  if (isClick) {
    return true; // Always check clicks (100%)
  }
  
  // Check remaining quota
  const remaining = await pixalate.getRemainingQuota();
  
  if (remaining < 100) {
    // Low on quota - reduce sampling to 5%
    return Math.random() < 0.05;
  } else if (remaining < 300) {
    // Medium quota - sample 10%
    return Math.random() < 0.10;
  } else {
    // Good quota - sample 15%
    return Math.random() < 0.15;
  }
}

/**
 * POST /track/impression/:impressionId
 * Log an impression event
 * 
 * IAB Standard: Client-initiated counting with "begin-to-render" measurement
 * impressionId is a unique UUID generated when the ad is served
 */
router.post('/track/impression/:impressionId', trackingRateLimiter, async (req, res) => {
  try {
    const { impressionId } = req.params;
    const {
      campaign_id,
      publisher_id,
      slot_id,
      geo,
      device,
    } = req.body;

    // Validate required fields
    if (!campaign_id || !publisher_id || !slot_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['campaign_id', 'publisher_id', 'slot_id'],
      });
    }

    // Check for duplicate impression (idempotency) - IAB standard: 24-hour window
    const idempotencyKey = `impression:${impressionId}`;
    const exists = await cache.exists(idempotencyKey);
    
    if (exists) {
      return res.status(200).json({
        message: 'Impression already logged',
        impression_id: impressionId,
      });
    }

    // Extract context data (IAB standard fields)
    const userAgent = req.headers['user-agent'] || '';
    const clientIP = getClientIP(req);
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    const pageUrl = (req.body.page_url as string) || referer || '';
    const sessionId = await getOrCreateSessionId(req);
    const cacheBuster = (req.body.cache_buster as string) || '';
    
    // GIVT pre-filtering (reduces Pixalate API calls by 40-60%)
    const isInvalidTraffic = await isGIVT(clientIP, userAgent);
    if (isInvalidTraffic) {
      fraudLogger.info('GIVT filtered impression', {
        impression_id: impressionId,
        ip: clientIP,
        user_agent: userAgent.substring(0, 100),
      });
      return res.status(403).json({
        error: 'Invalid traffic detected',
      });
    }

    // Calculate revenue (CPM or CPC)
    const campaignResult = await dbPool.query(
      'SELECT bid_model, bid_amount, require_viewability FROM campaigns WHERE id = $1',
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { bid_model, bid_amount, require_viewability } = campaignResult.rows[0];
    let revenue = null;
    
    if (bid_model === 'CPM') {
      revenue = parseFloat(bid_amount) / 1000; // CPM / 1000
      
      // If campaign requires viewability, don't count revenue yet (will be updated after viewability check)
      if (require_viewability) {
        revenue = null; // Will be set after viewability confirmation
      }
    }

    // Fraud detection (SIVT - Sophisticated Invalid Traffic)
    // Only check after GIVT pre-filter passes
    let fraudScore: number | null = null;
    let fraudStatus: 'clean' | 'suspicious' | 'fraud' = 'clean';
    
    const shouldCheck = await shouldCheckFraud(false); // Impressions with sampling
    if (shouldCheck) {
      fraudScore = await pixalate.checkIPFraud(clientIP);
      fraudStatus = pixalate.getFraudStatus(fraudScore);
      
      // Block if fraud score is extremely high (>= 0.9)
      if (pixalate.shouldBlockTraffic(fraudScore)) {
        fraudLogger.warn('Blocked impression due to high fraud score', {
          ip: clientIP,
          fraud_score: fraudScore,
          campaign_id,
          publisher_id,
        });
        return res.status(403).json({
          error: 'Request rejected',
        });
      }
      
      // Don't count revenue if fraud score is high (>= 0.7)
      if (!pixalate.shouldCountRevenue(fraudScore)) {
        revenue = null; // Set revenue to null so it's not counted
        fraudLogger.warn('Not counting revenue due to fraud score', {
          ip: clientIP,
          fraud_score: fraudScore,
          campaign_id,
          publisher_id,
        });
      }
    }

    // Use database transaction to ensure atomicity and prevent budget overruns
    const client = await dbPool.connect();
    let impressionResult;
    
    try {
      await client.query('BEGIN');
      
      // Insert impression with full context data
      impressionResult = await client.query(
        `INSERT INTO impressions 
         (ad_id, campaign_id, publisher_id, slot_id, geo, device, revenue, fraud_score, fraud_status,
          user_agent, ip_address, referer, page_url, session_id, cache_buster, viewable, billed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id`,
        [
          impressionId, campaign_id, publisher_id, slot_id, geo || null, device || null, 
          revenue, fraudScore, fraudStatus,
          userAgent, clientIP, referer, pageUrl, sessionId, cacheBuster,
          null, // viewable - will be updated by viewability tracking
          revenue !== null // billed - only if revenue was counted immediately
        ]
      );

      // Update campaign spend with overspend protection
      if (revenue) {
        // Atomic update with budget check - prevents overspending
        const updateResult = await client.query(
          `UPDATE campaigns 
           SET spent_budget = spent_budget + $1 
           WHERE id = $2 
           AND spent_budget + $1 <= total_budget
           RETURNING total_budget, spent_budget`,
          [revenue, campaign_id]
        );
        
        // If update didn't affect any rows, campaign budget is exceeded
        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          trackingLogger.warn('Campaign budget exceeded', {
            impression_id: impressionId,
            campaign_id,
            revenue,
          });
          return res.status(402).json({
            error: 'Campaign budget exceeded',
            message: 'This campaign has reached its budget limit',
          });
        }
        
        // Commit transaction before external operations
        await client.query('COMMIT');
        
        // Increment hourly spend for budget pacing (Phase 2.2 integration)
        await incrementHourlySpend(campaign_id as string, revenue);
        
        // Smart cache invalidation: only invalidate on budget thresholds
        const { total_budget, spent_budget } = updateResult.rows[0];
        const budgetPercent = (parseFloat(spent_budget) / parseFloat(total_budget)) * 100;
        
        // Invalidate cache at 25%, 50%, 75%, 90%, and 100% thresholds
        const thresholds = [25, 50, 75, 90, 100];
        const shouldInvalidate = thresholds.some(threshold => {
          const prevPercent = ((parseFloat(spent_budget) - revenue) / parseFloat(total_budget)) * 100;
          return prevPercent < threshold && budgetPercent >= threshold;
        });
        
        if (shouldInvalidate) {
          const { invalidateCampaignCache } = await import('../services/matching.service.js');
          await invalidateCampaignCache();
        }
      } else {
        // No revenue to track, just commit
        await client.query('COMMIT');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Set idempotency key (expires in 24 hours - IAB standard)
    await cache.set(idempotencyKey, true, 86400);
    
    // Store impression timestamp for time-based fraud detection (24 hour TTL)
    await cache.set(`impression:timestamp:${impressionId}`, Date.now(), 86400);
    
    // Increment frequency cap counter
    await incrementFrequency(req, campaign_id);

    trackingLogger.info('Impression tracked', {
      impression_id: impressionResult.rows[0].id,
      unique_impression_id: impressionId,
      campaign_id,
      publisher_id,
      slot_id,
      revenue,
      fraud_status: fraudStatus,
    });
    
    res.status(200).json({
      success: true,
      impression_id: impressionResult.rows[0].id,
      unique_impression_id: impressionId,
    });
  } catch (error) {
    trackingLogger.error('Impression tracking error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      impression_id: req.params.impressionId,
      campaign_id: req.body.campaign_id,
      publisher_id: req.body.publisher_id,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /track/click/:impressionId
 * Log a click event and redirect to advertiser landing page
 * 
 * impressionId is the same UUID used for the impression
 */
router.get('/track/click/:impressionId', trackingRateLimiter, async (req, res) => {
  try {
    const { impressionId } = req.params;
    const { campaign_id, publisher_id, slot_id, geo, device } = req.query;

    // Validate required fields
    if (!campaign_id || !publisher_id || !slot_id) {
      return res.status(400).json({
        error: 'Missing required query parameters',
        required: ['campaign_id', 'publisher_id', 'slot_id'],
      });
    }

    // Check for duplicate click (idempotency) - IAB standard: 24-hour window
    const idempotencyKey = `click:${impressionId}`;
    const exists = await cache.exists(idempotencyKey);
    
    if (exists) {
      // Still redirect even if duplicate
      const campaignResult = await dbPool.query(
        'SELECT landing_page_url FROM campaigns WHERE id = $1',
        [campaign_id]
      );
      if (campaignResult.rows.length > 0) {
        return res.redirect(campaignResult.rows[0].landing_page_url);
      }
    }

    // Extract context data (IAB standard fields)
    const userAgent = req.headers['user-agent'] || '';
    const clientIP = getClientIP(req);
    const referer = req.headers['referer'] || req.headers['referrer'] || '';
    const pageUrl = (typeof req.query.page_url === 'string' ? req.query.page_url : '') || referer || '';
    const sessionId = await getOrCreateSessionId(req);
    const cacheBuster = (typeof req.query.cache_buster === 'string' ? req.query.cache_buster : '') || '';
    
    // GIVT pre-filtering
    const isInvalidTraffic = await isGIVT(clientIP, userAgent);
    if (isInvalidTraffic) {
      fraudLogger.info('GIVT filtered click', {
        impression_id: impressionId,
        ip: clientIP,
        user_agent: userAgent.substring(0, 100),
      });
      // Still redirect user but don't track click
      const campaignResult = await dbPool.query(
        'SELECT landing_page_url FROM campaigns WHERE id = $1',
        [campaign_id]
      );
      if (campaignResult.rows.length > 0) {
        return res.redirect(campaignResult.rows[0].landing_page_url);
      }
      return res.status(403).json({
        error: 'Invalid traffic detected',
      });
    }

    // Get campaign details for revenue calculation
    const campaignResult = await dbPool.query(
      'SELECT bid_model, bid_amount, landing_page_url FROM campaigns WHERE id = $1',
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { bid_model, bid_amount, landing_page_url } = campaignResult.rows[0];
    
    // Google Transparent Click Tracker: Validate url parameter matches campaign landing page
    const declaredUrl = req.query.url as string;
    if (declaredUrl && declaredUrl !== landing_page_url) {
      trackingLogger.warn('Transparent Click Tracker URL mismatch', {
        impression_id: impressionId,
        declared_url: declaredUrl,
        actual_url: landing_page_url,
        campaign_id,
      });
    }
    
    let revenue = null;
    
    if (bid_model === 'CPC') {
      revenue = parseFloat(bid_amount);
    }

    // Time-based fraud detection: Check if click is too fast after impression
    const impressionTimestamp = await cache.get<number>(`impression:timestamp:${impressionId}`);
    let isFastClick = false;
    
    if (impressionTimestamp) {
      const timeSinceImpression = Date.now() - impressionTimestamp;
      if (timeSinceImpression < 1000) {
        // Click occurred less than 1 second after impression - suspicious
        isFastClick = true;
        fraudLogger.warn('Fast click detected', {
          impression_id: impressionId,
          time_since_impression_ms: timeSinceImpression,
          campaign_id,
          publisher_id,
        });
      }
    } else {
      // No impression found for this click - suspicious
      fraudLogger.warn('Click without preceding impression', {
        impression_id: impressionId,
        campaign_id,
        publisher_id,
      });
    }

    // Fraud detection for clicks (100% of clicks - SIVT only, GIVT already filtered)
    let fraudScore: number | null = null;
    let fraudStatus: 'clean' | 'suspicious' | 'fraud' = 'clean';
    
    // If fast click detected, mark as suspicious and don't count revenue
    if (isFastClick || !impressionTimestamp) {
      fraudStatus = 'suspicious';
      revenue = null; // Don't count revenue for suspicious fast clicks
    }
    
    const shouldCheck = await shouldCheckFraud(true); // Always true for clicks
    if (shouldCheck) {
      fraudScore = await pixalate.checkIPFraud(clientIP);
      const pixalateFraudStatus = pixalate.getFraudStatus(fraudScore);
      
      // Use worse of time-based and Pixalate fraud status
      if (pixalateFraudStatus === 'fraud') {
        fraudStatus = 'fraud';
      } else if (pixalateFraudStatus === 'suspicious' || fraudStatus === 'suspicious') {
        fraudStatus = 'suspicious';
      }
      
      // Block if fraud score is extremely high (>= 0.9)
      if (pixalate.shouldBlockTraffic(fraudScore)) {
        fraudLogger.warn('Blocked click due to high fraud score', {
          ip: clientIP,
          fraud_score: fraudScore,
          campaign_id,
          publisher_id,
        });
        return res.status(403).json({
          error: 'Request rejected',
        });
      }
      
      // Don't count revenue if fraud score is high (>= 0.7)
      if (!pixalate.shouldCountRevenue(fraudScore)) {
        revenue = null; // Set revenue to null so it's not counted
        fraudLogger.warn('Not counting revenue for click due to fraud score', {
          ip: clientIP,
          fraud_score: fraudScore,
          campaign_id,
          publisher_id,
        });
      }
    }

    // Use database transaction to ensure atomicity and prevent budget overruns
    const client = await dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert click with full context data
      await client.query(
        `INSERT INTO clicks 
         (ad_id, campaign_id, publisher_id, slot_id, geo, device, revenue, fraud_score, fraud_status,
          user_agent, ip_address, referer, page_url, session_id, cache_buster)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          impressionId, campaign_id, publisher_id, slot_id, geo || null, device || null, 
          revenue, fraudScore, fraudStatus,
          userAgent, clientIP, referer, pageUrl, sessionId, cacheBuster
        ]
      );

      // Update campaign spend with overspend protection
      if (revenue) {
        // Atomic update with budget check - prevents overspending
        const updateResult = await client.query(
          `UPDATE campaigns 
           SET spent_budget = spent_budget + $1 
           WHERE id = $2 
           AND spent_budget + $1 <= total_budget
           RETURNING total_budget, spent_budget`,
          [revenue, campaign_id]
        );
        
        // If update didn't affect any rows, campaign budget is exceeded
        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          trackingLogger.warn('Campaign budget exceeded on click', {
            impression_id: impressionId,
            campaign_id,
            revenue,
          });
          // Still redirect user, but don't charge
          return res.redirect(landing_page_url);
        }
        
        // Commit transaction before external operations
        await client.query('COMMIT');
        
        // Increment hourly spend for budget pacing (Phase 2.2 integration)
        await incrementHourlySpend(campaign_id as string, revenue);
        
        // Smart cache invalidation: only invalidate on budget thresholds
        const { total_budget, spent_budget } = updateResult.rows[0];
        const budgetPercent = (parseFloat(spent_budget) / parseFloat(total_budget)) * 100;
        
        // Invalidate cache at 25%, 50%, 75%, 90%, and 100% thresholds
        const thresholds = [25, 50, 75, 90, 100];
        const shouldInvalidate = thresholds.some(threshold => {
          const prevPercent = ((parseFloat(spent_budget) - revenue) / parseFloat(total_budget)) * 100;
          return prevPercent < threshold && budgetPercent >= threshold;
        });
        
        if (shouldInvalidate) {
          const { invalidateCampaignCache } = await import('../services/matching.service.js');
          await invalidateCampaignCache();
        }
      } else {
        // No revenue to track, just commit
        await client.query('COMMIT');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Set idempotency key (expires in 24 hours - IAB standard)
    await cache.set(idempotencyKey, true, 86400);

    trackingLogger.info('Click tracked', {
      impression_id: impressionId,
      campaign_id,
      publisher_id,
      slot_id,
      revenue,
      fraud_status: fraudStatus,
    });
    
    // Redirect to advertiser landing page
    res.redirect(landing_page_url);
  } catch (error) {
    trackingLogger.error('Click tracking error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      impression_id: req.params.impressionId,
      campaign_id: req.query.campaign_id,
      publisher_id: req.query.publisher_id,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /track/impression/pixel/:impressionId
 * Tracking pixel endpoint - returns 1x1 transparent GIF
 * 
 * IAB Standard: "Begin-to-render" client-side impression counting
 * This is triggered when the ad creative starts loading on client
 * 
 * Query Parameters:
 * - campaign_id: Campaign UUID (required)
 * - publisher_id: Publisher UUID (required)
 * - slot_id: Ad slot ID (required)
 * - geo: Country code (optional)
 * - device: Device type (optional)
 * - cb: Cache-buster token (required for accuracy)
 */
router.get('/track/impression/pixel/:impressionId', trackingRateLimiter, async (req, res) => {
  try {
    const { impressionId } = req.params;
    const { campaign_id, publisher_id, slot_id, geo, device, cb } = req.query;

    // Always return the pixel, even if tracking fails (don't block ad rendering)
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', pixel.length.toString());
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Validate required fields
    if (!campaign_id || !publisher_id || !slot_id || !cb) {
      trackingLogger.warn('Tracking pixel missing required params', {
        impression_id: impressionId,
        has_campaign: !!campaign_id,
        has_publisher: !!publisher_id,
        has_slot: !!slot_id,
        has_cb: !!cb,
      });
      return res.end(pixel);
    }

    // Fire-and-forget impression tracking (don't await to keep pixel response fast)
    setImmediate(async () => {
      try {
        // Make internal POST request to impression tracking endpoint
        const trackingBody = {
          campaign_id,
          publisher_id,
          slot_id,
          geo,
          device,
          cache_buster: cb,
          page_url: req.headers['referer'] || '',
        };

        // Simulate POST request internally
        await fetch(`${process.env.API_URL || 'http://localhost:3001'}/track/impression/${impressionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': req.headers['user-agent'] || '',
            'X-Forwarded-For': getClientIP(req),
          },
          body: JSON.stringify(trackingBody),
        });
      } catch (error) {
        trackingLogger.error('Pixel tracking fire-and-forget error', {
          impression_id: impressionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Return pixel immediately
    res.end(pixel);
  } catch (error) {
    trackingLogger.error('Tracking pixel error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      impression_id: req.params.impressionId,
    });
    // Still return pixel even on error
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.setHeader('Content-Type', 'image/gif');
    res.end(pixel);
  }
});

/**
 * POST /track/impressions/batch
 * Batch impression tracking for high-volume publishers
 * Accepts up to 100 impressions per request
 * 
 * Body: Array of impression objects with same structure as single impression endpoint
 */
router.post('/track/impressions/batch', trackingRateLimiter, async (req, res) => {
  try {
    const impressions = req.body;

    // Validate batch size
    if (!Array.isArray(impressions)) {
      return res.status(400).json({
        error: 'Request body must be an array',
      });
    }

    if (impressions.length === 0) {
      return res.status(400).json({
        error: 'Batch cannot be empty',
      });
    }

    if (impressions.length > 100) {
      return res.status(400).json({
        error: 'Batch size exceeds maximum of 100 impressions',
      });
    }

    // Process impressions in parallel with Promise.allSettled
    const results = await Promise.allSettled(
      impressions.map(async (impression) => {
        const { impression_id, campaign_id, publisher_id, slot_id, geo, device, page_url, cache_buster } = impression;

        // Validate required fields
        if (!impression_id || !campaign_id || !publisher_id || !slot_id) {
          throw new Error('Missing required fields');
        }

        // Make internal POST request to single impression endpoint
        const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/track/impression/${impression_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': req.headers['user-agent'] || '',
            'X-Forwarded-For': getClientIP(req),
          },
          body: JSON.stringify({
            campaign_id,
            publisher_id,
            slot_id,
            geo,
            device,
            page_url,
            cache_buster,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    trackingLogger.info('Batch impressions processed', {
      total: impressions.length,
      successful,
      failed,
    });

    res.status(200).json({
      success: true,
      total: impressions.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        impression_id: impressions[i].impression_id,
        status: r.status,
        error: r.status === 'rejected' ? r.reason.message : undefined,
      })),
    });
  } catch (error) {
    trackingLogger.error('Batch impression tracking error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /track/viewability/:impressionId
 * Track viewability metrics (IAB/MRC standard: 50% visible for 1+ second)
 */
router.post('/track/viewability/:impressionId', trackingRateLimiter, async (req, res) => {
  try {
    const { impressionId } = req.params;
    const { slot_id, viewable_time, total_time, viewport_percentage } = req.body;
    
    // Validate required fields
    if (!slot_id || viewable_time === undefined || total_time === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['slot_id', 'viewable_time', 'total_time'],
      });
    }
    
    // Calculate if viewability met (IAB/MRC standard: 50% for 1+ second)
    const viewability_met = viewable_time >= 1000 && (viewport_percentage || 0) >= 50;
    
    // Insert viewability record
    await dbPool.query(
      `INSERT INTO ad_viewability 
       (ad_id, slot_id, viewable_time, total_time, viewport_percentage, viewability_met)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [impressionId, slot_id, viewable_time, total_time, viewport_percentage || null, viewability_met]
    );
    
    // Update impression with viewability status
    await dbPool.query(
      `UPDATE impressions 
       SET viewable = $1 
       WHERE ad_id = $2`,
      [viewability_met, impressionId]
    );
    
    // If viewability is met and campaign requires viewability, update revenue and billing
    if (viewability_met) {
      const result = await dbPool.query(
        `SELECT c.require_viewability, c.bid_model, c.bid_amount, c.total_budget, c.spent_budget,
                i.billed, i.publisher_id
         FROM impressions i
         JOIN campaigns c ON i.campaign_id = c.id
         WHERE i.ad_id = $1`,
        [impressionId]
      );
      
      if (result.rows.length > 0) {
        const { require_viewability, bid_model, bid_amount, total_budget, spent_budget, billed, publisher_id } = result.rows[0];
        
        // If campaign requires viewability and impression not yet billed
        if (require_viewability && !billed && bid_model === 'CPM') {
          const revenue = parseFloat(bid_amount) / 1000;
          
          // Check if budget allows this charge
          if (parseFloat(spent_budget) + revenue <= parseFloat(total_budget)) {
            // Update impression with revenue and mark as billed
            await dbPool.query(
              `UPDATE impressions 
               SET revenue = $1, billed = true 
               WHERE ad_id = $2`,
              [revenue, impressionId]
            );
            
            // Update campaign spend
            await dbPool.query(
              `UPDATE campaigns 
               SET spent_budget = spent_budget + $1 
               WHERE id = (SELECT campaign_id FROM impressions WHERE ad_id = $2)`,
              [revenue, impressionId]
            );
            
            console.log(`Viewability-based billing applied for impression ${impressionId}: ${revenue} ETH`);
          }
        }
      }
    }
    
    res.json({ 
      success: true,
      viewability_met,
    });
  } catch (error) {
    console.error('Viewability tracking error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /track/conversion/:impressionId
 * Track a conversion event with attribution
 * 
 * Body Parameters:
 * - conversion_type: Type of conversion (purchase, signup, lead, etc)
 * - conversion_value: Optional value of conversion in ETH
 * - conversion_data: Optional additional metadata
 * - attribution_window_days: Optional attribution window (default: 30 days)
 */
router.post('/track/conversion/:impressionId', trackingRateLimiter, async (req, res) => {
  try {
    const { impressionId } = req.params;
    const {
      conversion_type,
      conversion_value,
      conversion_data,
      attribution_window_days,
    } = req.body;

    // Validate required fields
    if (!conversion_type) {
      return res.status(400).json({
        error: 'Missing required field: conversion_type',
      });
    }

    // Check if conversion already exists (prevent duplicates)
    const exists = await conversionExists(impressionId, conversion_type);
    if (exists) {
      return res.status(200).json({
        success: true,
        message: 'Conversion already recorded',
        attributed: true,
      });
    }

    // Extract context data
    const userAgent = req.headers['user-agent'] || '';
    const clientIP = getClientIP(req);
    const refererHeader = req.headers['referer'] || req.headers['referrer'];
    const referer = (Array.isArray(refererHeader) ? refererHeader[0] : refererHeader) || '';
    const pageUrl = (req.body.page_url as string) || referer || '';

    // Track the conversion
    const result = await trackConversion({
      impressionId,
      conversionValue: conversion_value ? parseFloat(conversion_value) : undefined,
      conversionType: conversion_type,
      conversionData: conversion_data,
      attributionWindowDays: attribution_window_days,
      userAgent,
      ipAddress: clientIP,
      referer,
      pageUrl,
    });

    if (result.success) {
      trackingLogger.info('Conversion tracked', {
        conversion_id: result.conversionId,
        impression_id: impressionId,
        conversion_type,
        conversion_value,
        attributed: result.attributed,
        time_to_conversion_seconds: result.timeToConversionSeconds,
      });

      res.status(200).json({
        success: true,
        conversion_id: result.conversionId,
        attributed: result.attributed,
        time_to_conversion_seconds: result.timeToConversionSeconds,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    trackingLogger.error('Conversion tracking error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      impression_id: req.params.impressionId,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;




