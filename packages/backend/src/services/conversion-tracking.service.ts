/**
 * Conversion Tracking Service
 * Tracks post-click conversions with configurable attribution windows
 */

import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';
import { getAttributionWindow, getAttributionWindowSeconds } from '../config/tracking-config.js';
import { logger } from '../config/logger.js';

const conversionLogger = logger.child({ component: 'conversion-tracking' });

export interface ConversionData {
  impressionId: string;
  conversionValue?: number;
  conversionType: string; // 'purchase', 'signup', 'lead', 'custom'
  conversionData?: Record<string, any>;
  attributionWindowDays?: number;
  userAgent?: string;
  ipAddress?: string;
  referer?: string;
  pageUrl?: string;
}

export interface ConversionResult {
  success: boolean;
  conversionId?: string;
  attributed: boolean;
  timeToConversionSeconds?: number;
  message?: string;
}

/**
 * Track a conversion event
 * @param data Conversion data
 * @returns Conversion result with attribution status
 */
export async function trackConversion(data: ConversionData): Promise<ConversionResult> {
  try {
    const {
      impressionId,
      conversionValue,
      conversionType,
      conversionData,
      attributionWindowDays,
      userAgent,
      ipAddress,
      referer,
      pageUrl,
    } = data;

    // Validate required fields
    if (!impressionId || !conversionType) {
      return {
        success: false,
        attributed: false,
        message: 'Missing required fields: impressionId and conversionType',
      };
    }

    // Get attribution window (default to 30 days if not specified)
    const windowDays = attributionWindowDays || getAttributionWindow('default');
    const windowSeconds = windowDays * 24 * 60 * 60;

    // Find the click associated with this impression
    const clickResult = await dbPool.query(
      `SELECT id, campaign_id, publisher_id, timestamp
       FROM clicks
       WHERE ad_id = $1
       ORDER BY timestamp DESC
       LIMIT 1`,
      [impressionId]
    );

    if (clickResult.rows.length === 0) {
      conversionLogger.warn('No click found for conversion', {
        impression_id: impressionId,
        conversion_type: conversionType,
      });
      
      return {
        success: false,
        attributed: false,
        message: 'No click found for this impression',
      };
    }

    const click = clickResult.rows[0];
    const clickTime = new Date(click.timestamp).getTime();
    const conversionTime = Date.now();
    const timeToConversionSeconds = Math.floor((conversionTime - clickTime) / 1000);

    // Check if conversion is within attribution window
    const attributedWithinWindow = timeToConversionSeconds <= windowSeconds;

    if (!attributedWithinWindow) {
      conversionLogger.info('Conversion outside attribution window', {
        impression_id: impressionId,
        time_to_conversion_seconds: timeToConversionSeconds,
        attribution_window_seconds: windowSeconds,
      });
    }

    // Insert conversion record
    const insertResult = await dbPool.query(
      `INSERT INTO conversions
       (click_id, impression_id, campaign_id, publisher_id, conversion_value, conversion_type,
        conversion_data, attributed_within_window, attribution_window_days, time_to_conversion_seconds,
        user_agent, ip_address, referer, page_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        click.id,
        impressionId,
        click.campaign_id,
        click.publisher_id,
        conversionValue || null,
        conversionType,
        conversionData ? JSON.stringify(conversionData) : null,
        attributedWithinWindow,
        windowDays,
        timeToConversionSeconds,
        userAgent || null,
        ipAddress || null,
        referer || null,
        pageUrl || null,
      ]
    );

    const conversionId = insertResult.rows[0].id;

    // Update the click record to mark it as converted
    if (attributedWithinWindow) {
      await dbPool.query(
        `UPDATE clicks SET converted = true WHERE id = $1`,
        [click.id]
      );
    }

    // Cache conversion for quick lookups (24 hour TTL)
    await cache.set(
      `conversion:${impressionId}:${conversionType}`,
      { conversionId, attributed: attributedWithinWindow },
      86400
    );

    conversionLogger.info('Conversion tracked', {
      conversion_id: conversionId,
      impression_id: impressionId,
      campaign_id: click.campaign_id,
      publisher_id: click.publisher_id,
      conversion_type: conversionType,
      conversion_value: conversionValue,
      attributed: attributedWithinWindow,
      time_to_conversion_seconds: timeToConversionSeconds,
    });

    return {
      success: true,
      conversionId,
      attributed: attributedWithinWindow,
      timeToConversionSeconds,
      message: attributedWithinWindow 
        ? 'Conversion tracked and attributed'
        : 'Conversion tracked but outside attribution window',
    };
  } catch (error) {
    conversionLogger.error('Error tracking conversion', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      impression_id: data.impressionId,
    });

    return {
      success: false,
      attributed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get conversion statistics for a campaign
 */
export async function getCampaignConversionStats(
  campaignId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalConversions: number;
  attributedConversions: number;
  totalValue: number;
  conversionRate: number;
  avgTimeToConversion: number;
  conversionsByType: Record<string, number>;
}> {
  try {
    let query = `
      SELECT
        COUNT(*) as total_conversions,
        COUNT(*) FILTER (WHERE attributed_within_window = true) as attributed_conversions,
        COALESCE(SUM(conversion_value), 0) as total_value,
        AVG(time_to_conversion_seconds) as avg_time_to_conversion,
        conversion_type
      FROM conversions
      WHERE campaign_id = $1
    `;
    
    const params: any[] = [campaignId];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }
    
    query += ` GROUP BY conversion_type`;
    
    const result = await dbPool.query(query, params);
    
    // Aggregate results
    let totalConversions = 0;
    let attributedConversions = 0;
    let totalValue = 0;
    let totalTimeToConversion = 0;
    const conversionsByType: Record<string, number> = {};
    
    for (const row of result.rows) {
      const count = parseInt(row.total_conversions);
      totalConversions += count;
      attributedConversions += parseInt(row.attributed_conversions);
      totalValue += parseFloat(row.total_value || 0);
      totalTimeToConversion += parseFloat(row.avg_time_to_conversion || 0) * count;
      conversionsByType[row.conversion_type] = count;
    }
    
    // Get total clicks for conversion rate calculation
    let clickQuery = `SELECT COUNT(*) as total_clicks FROM clicks WHERE campaign_id = $1`;
    const clickParams: any[] = [campaignId];
    
    if (startDate) {
      clickParams.push(startDate);
      clickQuery += ` AND timestamp >= $${clickParams.length}`;
    }
    
    if (endDate) {
      clickParams.push(endDate);
      clickQuery += ` AND timestamp <= $${clickParams.length}`;
    }
    
    const clickResult = await dbPool.query(clickQuery, clickParams);
    const totalClicks = parseInt(clickResult.rows[0]?.total_clicks || 0);
    
    const conversionRate = totalClicks > 0 ? (attributedConversions / totalClicks) : 0;
    const avgTimeToConversion = totalConversions > 0 ? (totalTimeToConversion / totalConversions) : 0;
    
    return {
      totalConversions,
      attributedConversions,
      totalValue,
      conversionRate,
      avgTimeToConversion,
      conversionsByType,
    };
  } catch (error) {
    conversionLogger.error('Error getting campaign conversion stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      campaign_id: campaignId,
    });
    
    return {
      totalConversions: 0,
      attributedConversions: 0,
      totalValue: 0,
      conversionRate: 0,
      avgTimeToConversion: 0,
      conversionsByType: {},
    };
  }
}

/**
 * Get conversion statistics for a publisher
 */
export async function getPublisherConversionStats(
  publisherId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalConversions: number;
  attributedConversions: number;
  totalValue: number;
  conversionsByType: Record<string, number>;
}> {
  try {
    let query = `
      SELECT
        COUNT(*) as total_conversions,
        COUNT(*) FILTER (WHERE attributed_within_window = true) as attributed_conversions,
        COALESCE(SUM(conversion_value), 0) as total_value,
        conversion_type
      FROM conversions
      WHERE publisher_id = $1
    `;
    
    const params: any[] = [publisherId];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND timestamp >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND timestamp <= $${params.length}`;
    }
    
    query += ` GROUP BY conversion_type`;
    
    const result = await dbPool.query(query, params);
    
    let totalConversions = 0;
    let attributedConversions = 0;
    let totalValue = 0;
    const conversionsByType: Record<string, number> = {};
    
    for (const row of result.rows) {
      totalConversions += parseInt(row.total_conversions);
      attributedConversions += parseInt(row.attributed_conversions);
      totalValue += parseFloat(row.total_value || 0);
      conversionsByType[row.conversion_type] = parseInt(row.total_conversions);
    }
    
    return {
      totalConversions,
      attributedConversions,
      totalValue,
      conversionsByType,
    };
  } catch (error) {
    conversionLogger.error('Error getting publisher conversion stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      publisher_id: publisherId,
    });
    
    return {
      totalConversions: 0,
      attributedConversions: 0,
      totalValue: 0,
      conversionsByType: {},
    };
  }
}

/**
 * Check if a conversion already exists for an impression
 */
export async function conversionExists(
  impressionId: string,
  conversionType: string
): Promise<boolean> {
  // Check cache first
  const cached = await cache.get(`conversion:${impressionId}:${conversionType}`);
  if (cached !== null) {
    return true;
  }
  
  // Check database
  const result = await dbPool.query(
    `SELECT id FROM conversions WHERE impression_id = $1 AND conversion_type = $2 LIMIT 1`,
    [impressionId, conversionType]
  );
  
  return result.rows.length > 0;
}

