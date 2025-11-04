/**
 * Tracking Routes
 * Impression and click tracking endpoints
 */

import { Router } from 'express';
import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';

const router = Router();

/**
 * POST /track/impression/:adId
 * Log an impression event
 */
router.post('/track/impression/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
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

    // Check for duplicate impression (idempotency)
    const idempotencyKey = `impression:${adId}:${publisher_id}:${Date.now()}`;
    const exists = await cache.exists(idempotencyKey);
    
    if (exists) {
      return res.status(200).json({
        message: 'Impression already logged',
        ad_id: adId,
      });
    }

    // Calculate revenue (CPM or CPC)
    const campaignResult = await dbPool.query(
      'SELECT bid_model, bid_amount FROM campaigns WHERE id = $1',
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { bid_model, bid_amount } = campaignResult.rows[0];
    let revenue = null;
    
    if (bid_model === 'CPM') {
      revenue = parseFloat(bid_amount) / 1000; // CPM / 1000
    }

    // Insert impression
    const result = await dbPool.query(
      `INSERT INTO impressions 
       (ad_id, campaign_id, publisher_id, slot_id, geo, device, revenue)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [adId, campaign_id, publisher_id, slot_id, geo || null, device || null, revenue]
    );

    // Update campaign spend
    if (revenue) {
      await dbPool.query(
        'UPDATE campaigns SET spent_budget = spent_budget + $1 WHERE id = $2',
        [revenue, campaign_id]
      );
    }

    // Set idempotency key (expires in 1 hour)
    await cache.set(idempotencyKey, true, 3600);

    // Invalidate campaign cache
    await cache.del('active_campaigns');

    res.status(200).json({
      success: true,
      impression_id: result.rows[0].id,
      ad_id: adId,
    });
  } catch (error) {
    console.error('Impression tracking error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /track/click/:adId
 * Log a click event and redirect to advertiser landing page
 */
router.get('/track/click/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { campaign_id, publisher_id, slot_id, geo, device } = req.query;

    // Validate required fields
    if (!campaign_id || !publisher_id || !slot_id) {
      return res.status(400).json({
        error: 'Missing required query parameters',
        required: ['campaign_id', 'publisher_id', 'slot_id'],
      });
    }

    // Check for duplicate click (idempotency)
    const idempotencyKey = `click:${adId}:${publisher_id}:${Date.now()}`;
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

    // Get campaign details for revenue calculation
    const campaignResult = await dbPool.query(
      'SELECT bid_model, bid_amount, landing_page_url FROM campaigns WHERE id = $1',
      [campaign_id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { bid_model, bid_amount, landing_page_url } = campaignResult.rows[0];
    let revenue = null;
    
    if (bid_model === 'CPC') {
      revenue = parseFloat(bid_amount);
    }

    // Insert click
    await dbPool.query(
      `INSERT INTO clicks 
       (ad_id, campaign_id, publisher_id, slot_id, geo, device, revenue)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adId, campaign_id, publisher_id, slot_id, geo || null, device || null, revenue]
    );

    // Update campaign spend
    if (revenue) {
      await dbPool.query(
        'UPDATE campaigns SET spent_budget = spent_budget + $1 WHERE id = $2',
        [revenue, campaign_id]
      );
    }

    // Set idempotency key
    await cache.set(idempotencyKey, true, 3600);

    // Invalidate cache
    await cache.del('active_campaigns');

    // Redirect to advertiser landing page
    res.redirect(landing_page_url);
  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

