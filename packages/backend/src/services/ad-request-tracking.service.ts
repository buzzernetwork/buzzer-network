/**
 * Ad Request Tracking Service
 * Tracks all ad requests for accurate fill rate calculation
 */

import { dbPool } from '../config/database.js';

export interface AdRequestData {
  publisherId: string;
  slotId: string;
  format: string;
  geo?: string;
  device?: string;
  filled: boolean;
  campaignId?: string;
  reason?: 'no_match' | 'budget_exceeded' | 'freq_cap' | 'blocked' | 'error';
}

/**
 * Track an ad request (filled or unfilled)
 */
export async function trackAdRequest(data: AdRequestData): Promise<void> {
  try {
    await dbPool.query(
      `INSERT INTO ad_requests 
       (publisher_id, slot_id, format, geo, device, filled, campaign_id, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.publisherId,
        data.slotId,
        data.format,
        data.geo || null,
        data.device || null,
        data.filled,
        data.campaignId || null,
        data.reason || null,
      ]
    );
  } catch (error) {
    // Log but don't throw - tracking failures shouldn't break ad serving
    console.error('Error tracking ad request:', error);
  }
}

/**
 * Calculate fill rate for a slot over a date range
 */
export async function calculateFillRate(
  slotId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  total_requests: number;
  filled_requests: number;
  fill_rate: number;
  unfilled_reasons: Record<string, number>;
}> {
  // Get total and filled requests
  const requestsResult = await dbPool.query(
    `SELECT 
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE filled = true) as filled_requests
     FROM ad_requests
     WHERE slot_id = $1
       AND timestamp >= $2
       AND timestamp < $3`,
    [slotId, startDate, endDate]
  );

  const totalRequests = parseInt(requestsResult.rows[0]?.total_requests || '0');
  const filledRequests = parseInt(requestsResult.rows[0]?.filled_requests || '0');
  const fillRate = totalRequests > 0 ? filledRequests / totalRequests : 0;

  // Get unfilled reasons breakdown
  const reasonsResult = await dbPool.query(
    `SELECT 
      reason,
      COUNT(*) as count
     FROM ad_requests
     WHERE slot_id = $1
       AND timestamp >= $2
       AND timestamp < $3
       AND filled = false
       AND reason IS NOT NULL
     GROUP BY reason`,
    [slotId, startDate, endDate]
  );

  const unfilledReasons: Record<string, number> = {};
  for (const row of reasonsResult.rows) {
    unfilledReasons[row.reason] = parseInt(row.count);
  }

  return {
    total_requests: totalRequests,
    filled_requests: filledRequests,
    fill_rate: fillRate,
    unfilled_reasons: unfilledReasons,
  };
}

/**
 * Get fill rate statistics for a publisher
 */
export async function getPublisherFillRateStats(
  publisherId: string,
  days: number = 30
): Promise<{
  overall_fill_rate: number;
  total_requests: number;
  filled_requests: number;
  by_format: Record<string, { fill_rate: number; requests: number }>;
  by_device: Record<string, { fill_rate: number; requests: number }>;
  top_unfilled_reasons: Array<{ reason: string; count: number; percentage: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Overall stats
  const overallResult = await dbPool.query(
    `SELECT 
      COUNT(*) as total_requests,
      COUNT(*) FILTER (WHERE filled = true) as filled_requests
     FROM ad_requests
     WHERE publisher_id = $1
       AND timestamp >= $2`,
    [publisherId, startDate]
  );

  const totalRequests = parseInt(overallResult.rows[0]?.total_requests || '0');
  const filledRequests = parseInt(overallResult.rows[0]?.filled_requests || '0');
  const overallFillRate = totalRequests > 0 ? filledRequests / totalRequests : 0;

  // By format
  const formatResult = await dbPool.query(
    `SELECT 
      format,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE filled = true) as filled
     FROM ad_requests
     WHERE publisher_id = $1
       AND timestamp >= $2
     GROUP BY format`,
    [publisherId, startDate]
  );

  const byFormat: Record<string, { fill_rate: number; requests: number }> = {};
  for (const row of formatResult.rows) {
    const total = parseInt(row.total);
    const filled = parseInt(row.filled);
    byFormat[row.format] = {
      fill_rate: total > 0 ? filled / total : 0,
      requests: total,
    };
  }

  // By device
  const deviceResult = await dbPool.query(
    `SELECT 
      device,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE filled = true) as filled
     FROM ad_requests
     WHERE publisher_id = $1
       AND timestamp >= $2
       AND device IS NOT NULL
     GROUP BY device`,
    [publisherId, startDate]
  );

  const byDevice: Record<string, { fill_rate: number; requests: number }> = {};
  for (const row of deviceResult.rows) {
    const total = parseInt(row.total);
    const filled = parseInt(row.filled);
    byDevice[row.device] = {
      fill_rate: total > 0 ? filled / total : 0,
      requests: total,
    };
  }

  // Top unfilled reasons
  const reasonsResult = await dbPool.query(
    `SELECT 
      reason,
      COUNT(*) as count
     FROM ad_requests
     WHERE publisher_id = $1
       AND timestamp >= $2
       AND filled = false
       AND reason IS NOT NULL
     GROUP BY reason
     ORDER BY count DESC
     LIMIT 10`,
    [publisherId, startDate]
  );

  const unfilledCount = totalRequests - filledRequests;
  const topUnfilledReasons = reasonsResult.rows.map(row => ({
    reason: row.reason,
    count: parseInt(row.count),
    percentage: unfilledCount > 0 ? (parseInt(row.count) / unfilledCount) * 100 : 0,
  }));

  return {
    overall_fill_rate: overallFillRate,
    total_requests: totalRequests,
    filled_requests: filledRequests,
    by_format: byFormat,
    by_device: byDevice,
    top_unfilled_reasons: topUnfilledReasons,
  };
}

