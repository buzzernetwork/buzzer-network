/**
 * Metrics Routes
 * Fill rate, viewability, and performance metrics endpoints
 */

import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { dbPool } from '../config/database.js';
import { 
  calculateFillRate, 
  getPublisherFillRateStats 
} from '../services/ad-request-tracking.service.js';
import { getSlotMetrics, getSlotSummary } from '../services/slot-metrics.service.js';

const router = Router();

/**
 * GET /api/v1/metrics/fill-rate/publisher/:publisherId
 * Get fill rate statistics for a publisher
 */
router.get('/fill-rate/publisher/:publisherId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { publisherId } = req.params;
    const { days = '30' } = req.query;
    const walletAddress = req.walletAddress;

    // Verify ownership
    const publisher = await dbPool.query(
      'SELECT wallet_address FROM publishers WHERE id = $1',
      [publisherId]
    );

    if (publisher.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    if (publisher.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get fill rate stats
    const stats = await getPublisherFillRateStats(publisherId, parseInt(days as string));

    res.json({
      publisher_id: publisherId,
      period_days: parseInt(days as string),
      ...stats,
    });
  } catch (error) {
    console.error('Fill rate stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/metrics/fill-rate/slot/:slotId
 * Get fill rate statistics for a specific slot
 */
router.get('/fill-rate/slot/:slotId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { slotId } = req.params;
    const { start_date, end_date } = req.query;
    const walletAddress = req.walletAddress;

    // Verify slot ownership
    const slot = await dbPool.query(
      `SELECT s.publisher_id, p.wallet_address 
       FROM ad_slots s
       JOIN publishers p ON s.publisher_id = p.id
       WHERE s.slot_id = $1`,
      [slotId]
    );

    if (slot.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Calculate fill rate
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date as string) : new Date();

    const fillRateData = await calculateFillRate(slotId, startDate, endDate);

    res.json({
      slot_id: slotId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      ...fillRateData,
    });
  } catch (error) {
    console.error('Slot fill rate error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/metrics/slot/:slotId/summary
 * Get comprehensive slot performance summary (including fill rate)
 */
router.get('/slot/:slotId/summary', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { slotId } = req.params;
    const { days = '30' } = req.query;
    const walletAddress = req.walletAddress;

    // Verify slot ownership
    const slot = await dbPool.query(
      `SELECT s.publisher_id, p.wallet_address 
       FROM ad_slots s
       JOIN publishers p ON s.publisher_id = p.id
       WHERE s.slot_id = $1`,
      [slotId]
    );

    if (slot.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get slot summary from slot_metrics aggregation
    const summary = await getSlotSummary(slotId, parseInt(days as string));

    res.json({
      slot_id: slotId,
      period_days: parseInt(days as string),
      ...summary,
    });
  } catch (error) {
    console.error('Slot summary error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/metrics/slot/:slotId/daily
 * Get daily metrics for a slot over a date range
 */
router.get('/slot/:slotId/daily', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { slotId } = req.params;
    const { start_date, end_date } = req.query;
    const walletAddress = req.walletAddress;

    // Verify slot ownership
    const slot = await dbPool.query(
      `SELECT s.publisher_id, p.wallet_address 
       FROM ad_slots s
       JOIN publishers p ON s.publisher_id = p.id
       WHERE s.slot_id = $1`,
      [slotId]
    );

    if (slot.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    if (slot.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get daily metrics
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date as string) : new Date();

    const metrics = await getSlotMetrics(slotId, startDate, endDate);

    res.json({
      slot_id: slotId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      metrics,
    });
  } catch (error) {
    console.error('Slot daily metrics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/metrics/viewability/campaign/:campaignId
 * Get viewability statistics for a campaign
 */
router.get('/viewability/campaign/:campaignId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = req.params;
    const { days = '30' } = req.query;
    const walletAddress = req.walletAddress;

    // Verify campaign ownership
    const campaign = await dbPool.query(
      `SELECT c.id, a.wallet_address 
       FROM campaigns c
       JOIN advertisers a ON c.advertiser_id = a.id
       WHERE c.id = $1`,
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get viewability stats
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const viewabilityResult = await dbPool.query(
      `SELECT 
        COUNT(*) as total_impressions,
        COUNT(*) FILTER (WHERE viewable = true) as viewable_impressions,
        COUNT(*) FILTER (WHERE viewable = false) as non_viewable_impressions,
        AVG(CASE WHEN viewable = true THEN 1.0 ELSE 0.0 END) as viewability_rate
       FROM impressions
       WHERE campaign_id = $1
         AND timestamp >= $2
         AND viewable IS NOT NULL`,
      [campaignId, startDate]
    );

    const totalImpressions = parseInt(viewabilityResult.rows[0]?.total_impressions || '0');
    const viewableImpressions = parseInt(viewabilityResult.rows[0]?.viewable_impressions || '0');
    const nonViewableImpressions = parseInt(viewabilityResult.rows[0]?.non_viewable_impressions || '0');
    const viewabilityRate = parseFloat(viewabilityResult.rows[0]?.viewability_rate || '0');

    res.json({
      campaign_id: campaignId,
      period_days: parseInt(days as string),
      total_impressions: totalImpressions,
      viewable_impressions: viewableImpressions,
      non_viewable_impressions: nonViewableImpressions,
      viewability_rate: viewabilityRate,
      viewability_percentage: (viewabilityRate * 100).toFixed(2) + '%',
      mrc_compliant: viewabilityRate >= 0.7, // 70% viewability is considered good
    });
  } catch (error) {
    console.error('Campaign viewability error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/metrics/viewability/publisher/:publisherId
 * Get viewability statistics for a publisher
 */
router.get('/viewability/publisher/:publisherId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { publisherId } = req.params;
    const { days = '30' } = req.query;
    const walletAddress = req.walletAddress;

    // Verify ownership
    const publisher = await dbPool.query(
      'SELECT wallet_address FROM publishers WHERE id = $1',
      [publisherId]
    );

    if (publisher.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    if (publisher.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get viewability stats
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const viewabilityResult = await dbPool.query(
      `SELECT 
        COUNT(*) as total_impressions,
        COUNT(*) FILTER (WHERE viewable = true) as viewable_impressions,
        COUNT(*) FILTER (WHERE viewable = false) as non_viewable_impressions,
        AVG(CASE WHEN viewable = true THEN 1.0 ELSE 0.0 END) as viewability_rate
       FROM impressions
       WHERE publisher_id = $1
         AND timestamp >= $2
         AND viewable IS NOT NULL`,
      [publisherId, startDate]
    );

    const totalImpressions = parseInt(viewabilityResult.rows[0]?.total_impressions || '0');
    const viewableImpressions = parseInt(viewabilityResult.rows[0]?.viewable_impressions || '0');
    const nonViewableImpressions = parseInt(viewabilityResult.rows[0]?.non_viewable_impressions || '0');
    const viewabilityRate = parseFloat(viewabilityResult.rows[0]?.viewability_rate || '0');

    res.json({
      publisher_id: publisherId,
      period_days: parseInt(days as string),
      total_impressions: totalImpressions,
      viewable_impressions: viewableImpressions,
      non_viewable_impressions: nonViewableImpressions,
      viewability_rate: viewabilityRate,
      viewability_percentage: (viewabilityRate * 100).toFixed(2) + '%',
      quality_tier: viewabilityRate >= 0.8 ? 'premium' : viewabilityRate >= 0.6 ? 'standard' : 'needs_improvement',
    });
  } catch (error) {
    console.error('Publisher viewability error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

