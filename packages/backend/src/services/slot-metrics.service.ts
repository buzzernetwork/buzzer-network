/**
 * Slot Metrics Aggregation Service
 * Calculates and stores daily performance metrics for ad slots
 */

import { dbPool, isDatabaseAvailable } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Aggregate metrics for a single slot for a specific date
 */
export async function aggregateSlotMetrics(slotId: string, date: Date = new Date()): Promise<void> {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  try {
    
    // Calculate impressions count
    const impressionsResult = await dbPool.query(
      `SELECT COUNT(*) as count
       FROM impressions
       WHERE slot_id = $1 AND DATE(timestamp) = $2`,
      [slotId, dateStr]
    );
    const impressions = parseInt(impressionsResult.rows[0]?.count || '0');
    
    // Calculate clicks count
    const clicksResult = await dbPool.query(
      `SELECT COUNT(*) as count
       FROM clicks
       WHERE slot_id = $1 AND DATE(timestamp) = $2`,
      [slotId, dateStr]
    );
    const clicks = parseInt(clicksResult.rows[0]?.count || '0');
    
    // Calculate total revenue
    const revenueResult = await dbPool.query(
      `SELECT 
        COALESCE(
          (SELECT SUM(revenue) FROM impressions WHERE slot_id = $1 AND DATE(timestamp) = $2 AND revenue IS NOT NULL),
          0
        ) +
        COALESCE(
          (SELECT SUM(revenue) FROM clicks WHERE slot_id = $1 AND DATE(timestamp) = $2 AND revenue IS NOT NULL),
          0
        ) as total_revenue`,
      [slotId, dateStr]
    );
    const revenue = parseFloat(revenueResult.rows[0]?.total_revenue || '0');
    
    // Calculate CTR (click-through rate)
    const ctr = impressions > 0 ? clicks / impressions : 0;
    
    // Calculate viewability rate
    const viewabilityResult = await dbPool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE viewability_met = true) as met
       FROM ad_viewability
       WHERE slot_id = $1 AND DATE(timestamp) = $2`,
      [slotId, dateStr]
    );
    const totalViewabilityChecks = parseInt(viewabilityResult.rows[0]?.total || '0');
    const metViewability = parseInt(viewabilityResult.rows[0]?.met || '0');
    const viewability_rate = totalViewabilityChecks > 0 ? metViewability / totalViewabilityChecks : 0;
    
    // Calculate eCPM (effective cost per mille)
    const ecpm = impressions > 0 ? (revenue / impressions) * 1000 : 0;
    
    // Calculate fill rate from ad_requests table
    const fillRateResult = await dbPool.query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE filled = true) as filled_requests
       FROM ad_requests
       WHERE slot_id = $1 AND DATE(timestamp) = $2`,
      [slotId, dateStr]
    );
    const totalRequests = parseInt(fillRateResult.rows[0]?.total_requests || '0');
    const filledRequests = parseInt(fillRateResult.rows[0]?.filled_requests || '0');
    const fill_rate = totalRequests > 0 ? filledRequests / totalRequests : 0;
    
    // Upsert metrics
    await dbPool.query(
      `INSERT INTO slot_metrics (
        slot_id, date, impressions, clicks, ctr, fill_rate, 
        viewability_rate, ecpm, revenue
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (slot_id, date) 
      DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        ctr = EXCLUDED.ctr,
        fill_rate = EXCLUDED.fill_rate,
        viewability_rate = EXCLUDED.viewability_rate,
        ecpm = EXCLUDED.ecpm,
        revenue = EXCLUDED.revenue`,
      [slotId, dateStr, impressions, clicks, ctr, fill_rate, viewability_rate, ecpm, revenue]
    );
    
    logger.debug(`Aggregated metrics for slot ${slotId} on ${dateStr}`);
  } catch (error) {
    logger.error(`Error aggregating metrics for slot ${slotId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      slotId,
      date: dateStr,
    });
    // Don't throw - continue with other slots even if one fails
  }
}

/**
 * Aggregate metrics for all slots for a specific date
 */
export async function aggregateAllSlotMetrics(date: Date = new Date()): Promise<void> {
  // Check database availability before processing
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    logger.warn('Database unavailable, skipping slot metrics aggregation');
    return;
  }

  try {
    logger.info(`Starting slot metrics aggregation for ${date.toISOString().split('T')[0]}`);
    
    // Get all unique slot IDs that had activity on this date
    const slotsResult = await dbPool.query(
      `SELECT DISTINCT slot_id FROM (
        SELECT slot_id FROM impressions WHERE DATE(timestamp) = $1
        UNION
        SELECT slot_id FROM clicks WHERE DATE(timestamp) = $1
      ) AS active_slots`,
      [date.toISOString().split('T')[0]]
    );
    
    const slotIds = slotsResult.rows.map(row => row.slot_id);
    
    if (slotIds.length === 0) {
      logger.debug('No active slots found for aggregation');
      return;
    }
    
    logger.info(`Found ${slotIds.length} active slots to aggregate`);
    
    // Aggregate metrics for each slot
    for (const slotId of slotIds) {
      await aggregateSlotMetrics(slotId, date);
    }
    
    logger.info(`Completed slot metrics aggregation for ${slotIds.length} slots`);
  } catch (error) {
    logger.error('Error in aggregateAllSlotMetrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      date: date.toISOString().split('T')[0],
    });
    // Don't throw - let worker continue even if one aggregation fails
  }
}

let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL = 5 * 60 * 1000; // Log errors at most once per 5 minutes

/**
 * Start hourly metrics aggregation worker
 */
export function startSlotMetricsWorker(): void {
  logger.info('Starting slot metrics aggregation worker...');
  
  // Run immediately for yesterday (in case we missed it)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  aggregateAllSlotMetrics(yesterday).catch(err => {
    logger.error('Error in initial metrics aggregation', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  });
  
  // Run every hour to aggregate the current day's metrics
  const HOURLY_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  setInterval(async () => {
    logger.debug('Running hourly slot metrics aggregation');
    try {
      // Aggregate today's metrics
      await aggregateAllSlotMetrics(new Date());
      
      // Also aggregate yesterday's metrics to catch any late data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await aggregateAllSlotMetrics(yesterday);
      
      logger.debug('Hourly slot metrics aggregation complete');
    } catch (error) {
      const now = Date.now();
      // Only log error once per 5 minutes to reduce verbosity
      if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
        logger.error('Hourly slot metrics aggregation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code,
        });
        lastErrorLogTime = now;
      }
    }
  }, HOURLY_INTERVAL);
  
  logger.info('Slot metrics worker started (runs every hour)');
}

/**
 * Get metrics for a slot over a date range
 */
export async function getSlotMetrics(
  slotId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const result = await dbPool.query(
    `SELECT *
     FROM slot_metrics
     WHERE slot_id = $1
       AND date >= $2
       AND date <= $3
     ORDER BY date ASC`,
    [slotId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
  );
  
  return result.rows;
}

/**
 * Get aggregated summary for a slot
 */
export async function getSlotSummary(slotId: string, days: number = 30): Promise<{
  total_impressions: number;
  total_clicks: number;
  total_revenue: number;
  avg_ctr: number;
  avg_ecpm: number;
  avg_viewability_rate: number;
  avg_fill_rate: number;
}> {
  const result = await dbPool.query(
    `SELECT 
      SUM(impressions)::int as total_impressions,
      SUM(clicks)::int as total_clicks,
      SUM(revenue) as total_revenue,
      AVG(ctr) as avg_ctr,
      AVG(ecpm) as avg_ecpm,
      AVG(viewability_rate) as avg_viewability_rate,
      AVG(fill_rate) as avg_fill_rate
     FROM slot_metrics
     WHERE slot_id = $1
       AND date >= CURRENT_DATE - INTERVAL '${days} days'`,
    [slotId]
  );
  
  const row = result.rows[0];
  
  return {
    total_impressions: parseInt(row?.total_impressions || '0'),
    total_clicks: parseInt(row?.total_clicks || '0'),
    total_revenue: parseFloat(row?.total_revenue || '0'),
    avg_ctr: parseFloat(row?.avg_ctr || '0'),
    avg_ecpm: parseFloat(row?.avg_ecpm || '0'),
    avg_viewability_rate: parseFloat(row?.avg_viewability_rate || '0'),
    avg_fill_rate: parseFloat(row?.avg_fill_rate || '0'),
  };
}

