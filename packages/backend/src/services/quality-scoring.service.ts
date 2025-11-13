/**
 * Quality Scoring Service
 * Calculates and updates publisher quality scores based on industry standards
 * 
 * Score Components (0-100):
 * - Traffic Quality (50 pts): Based on fraud detection scores
 * - Performance (30 pts): CTR and engagement metrics
 * - Domain Authority (20 pts): HTTPS, verification, age
 */

import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';

const QUALITY_SCORE_CACHE_TTL = 24 * 60 * 60; // 24 hours
const MINIMUM_IMPRESSIONS = 500; // Minimum data for scoring
const MINIMUM_DAYS_ACTIVE = 7; // Minimum days before full scoring

interface PublisherData {
  id: string;
  created_at: Date;
  domains: Array<{
    id: string;
    website_url: string;
    domain_verified: boolean;
  }>;
}

interface TrafficQualityData {
  avg_fraud_score: number;
  total_events: number;
  clean_percentage: number;
}

interface PerformanceData {
  ctr: number;
  total_impressions: number;
  total_clicks: number;
}

/**
 * Calculate network-wide average CTR for comparison
 */
export async function getNetworkAverageCTR(): Promise<number> {
  const cacheKey = 'quality:network_avg_ctr';
  const cached = await cache.get<number>(cacheKey);
  
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  try {
    const result = await dbPool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN clicks.id IS NOT NULL THEN 1 ELSE 0 END)::numeric / 
                 NULLIF(COUNT(impressions.id), 0), 0) as avg_ctr
      FROM impressions
      LEFT JOIN clicks ON clicks.impression_id = impressions.id
      WHERE impressions.timestamp >= NOW() - INTERVAL '30 days'
        AND impressions.verified = true
    `);

    const networkCTR = parseFloat(result.rows[0]?.avg_ctr || '0.001');
    
    // Cache for 1 hour
    await cache.set(cacheKey, networkCTR, 3600);
    
    return networkCTR;
  } catch (error) {
    console.error('[QualityScore] Error calculating network CTR:', error);
    return 0.001; // Fallback: 0.1% CTR
  }
}

/**
 * Get traffic quality data for a publisher (last 30 days)
 */
async function getTrafficQualityData(publisherId: string): Promise<TrafficQualityData> {
  try {
    const result = await dbPool.query(`
      SELECT 
        COALESCE(AVG(fraud_score), 0.3) as avg_fraud_score,
        COUNT(*) as total_events,
        COALESCE(SUM(CASE WHEN fraud_status = 'clean' THEN 1 ELSE 0 END)::numeric / 
                 NULLIF(COUNT(*), 0) * 100, 0) as clean_percentage
      FROM (
        SELECT fraud_score, fraud_status FROM impressions 
        WHERE publisher_id = $1 
          AND timestamp >= NOW() - INTERVAL '30 days'
          AND fraud_score IS NOT NULL
        UNION ALL
        SELECT fraud_score, fraud_status FROM clicks 
        WHERE publisher_id = $1 
          AND timestamp >= NOW() - INTERVAL '30 days'
          AND fraud_score IS NOT NULL
      ) as combined_traffic
    `, [publisherId]);

    return {
      avg_fraud_score: parseFloat(result.rows[0]?.avg_fraud_score || '0.3'),
      total_events: parseInt(result.rows[0]?.total_events || '0'),
      clean_percentage: parseFloat(result.rows[0]?.clean_percentage || '0'),
    };
  } catch (error) {
    console.error(`[QualityScore] Error getting traffic quality for ${publisherId}:`, error);
    return {
      avg_fraud_score: 0.3,
      total_events: 0,
      clean_percentage: 0,
    };
  }
}

/**
 * Get performance data for a publisher (last 30 days)
 */
async function getPerformanceData(publisherId: string): Promise<PerformanceData> {
  try {
    const result = await dbPool.query(`
      SELECT 
        COUNT(DISTINCT impressions.id) as total_impressions,
        COUNT(DISTINCT clicks.id) as total_clicks,
        COALESCE(COUNT(DISTINCT clicks.id)::numeric / 
                 NULLIF(COUNT(DISTINCT impressions.id), 0), 0) as ctr
      FROM impressions
      LEFT JOIN clicks ON clicks.impression_id = impressions.id
      WHERE impressions.publisher_id = $1
        AND impressions.timestamp >= NOW() - INTERVAL '30 days'
        AND impressions.verified = true
    `, [publisherId]);

    return {
      ctr: parseFloat(result.rows[0]?.ctr || '0'),
      total_impressions: parseInt(result.rows[0]?.total_impressions || '0'),
      total_clicks: parseInt(result.rows[0]?.total_clicks || '0'),
    };
  } catch (error) {
    console.error(`[QualityScore] Error getting performance data for ${publisherId}:`, error);
    return {
      ctr: 0,
      total_impressions: 0,
      total_clicks: 0,
    };
  }
}

/**
 * Get publisher data including domains
 */
async function getPublisherData(publisherId: string): Promise<PublisherData | null> {
  try {
    const result = await dbPool.query(`
      SELECT 
        p.id,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pd.id,
              'website_url', pd.website_url,
              'domain_verified', pd.domain_verified
            )
          ) FILTER (WHERE pd.id IS NOT NULL),
          '[]'::json
        ) as domains
      FROM publishers p
      LEFT JOIN publisher_domains pd ON p.id = pd.publisher_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [publisherId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      created_at: new Date(result.rows[0].created_at),
      domains: result.rows[0].domains || [],
    };
  } catch (error) {
    console.error(`[QualityScore] Error getting publisher data for ${publisherId}:`, error);
    return null;
  }
}

/**
 * Calculate Traffic Quality Score (0-50 points)
 * Based on fraud detection scores from last 30 days
 */
function calculateTrafficQualityScore(trafficData: TrafficQualityData): number {
  // If no fraud data yet, assume neutral (0.3 avg fraud score)
  const fraudScore = trafficData.total_events > 0 
    ? trafficData.avg_fraud_score 
    : 0.3;

  // Score = 50 * (1 - avg_fraud_score)
  // Lower fraud score = higher quality score
  const score = 50 * (1 - fraudScore);
  
  return Math.max(0, Math.min(50, score));
}

/**
 * Calculate Performance Score (0-30 points)
 * Based on CTR relative to network average
 */
async function calculatePerformanceScore(performanceData: PerformanceData): Promise<number> {
  // If insufficient data, award neutral score
  if (performanceData.total_impressions < MINIMUM_IMPRESSIONS) {
    return 15; // Neutral score
  }

  const networkAvgCTR = await getNetworkAverageCTR();
  
  // CTR Score (15 points max): publisher_ctr / network_avg_ctr * 15
  // Publisher with average CTR gets 15 points
  // Better than average gets up to 15+ points (capped at 15)
  const ctrRatio = performanceData.ctr / networkAvgCTR;
  const ctrScore = Math.min(15, ctrRatio * 15);

  // Engagement score (15 points): Based on having meaningful traffic
  // Award points for consistent activity
  const hasEngagement = performanceData.total_impressions >= MINIMUM_IMPRESSIONS;
  const engagementScore = hasEngagement ? 15 : (performanceData.total_impressions / MINIMUM_IMPRESSIONS) * 15;

  return Math.max(0, Math.min(30, ctrScore + engagementScore));
}

/**
 * Calculate Domain Authority Score (0-20 points)
 * Based on HTTPS, verification status, and age
 */
function calculateDomainAuthorityScore(publisherData: PublisherData): number {
  let score = 0;

  // Check if any domain uses HTTPS (8 points)
  const hasHTTPS = publisherData.domains.some(d => 
    d.website_url && d.website_url.toLowerCase().startsWith('https://')
  );
  if (hasHTTPS) {
    score += 8;
  }

  // Check if any domain is verified (7 points)
  const hasVerifiedDomain = publisherData.domains.some(d => d.domain_verified);
  if (hasVerifiedDomain) {
    score += 7;
  }

  // Check if account is > 30 days old (5 points)
  const accountAge = Date.now() - publisherData.created_at.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (accountAge > thirtyDaysMs) {
    score += 5;
  }

  return score;
}

/**
 * Calculate overall quality score for a publisher (0-100)
 * 
 * Formula:
 * - Traffic Quality: 50 points (based on fraud scores)
 * - Performance: 30 points (CTR and engagement)
 * - Domain Authority: 20 points (HTTPS, verified, age)
 * 
 * @param publisherId - Publisher UUID
 * @returns Quality score between 0 and 100
 */
export async function calculatePublisherQualityScore(publisherId: string): Promise<number> {
  try {
    console.log(`[QualityScore] Calculating score for publisher ${publisherId}`);

    // Get publisher data
    const publisherData = await getPublisherData(publisherId);
    if (!publisherData) {
      console.error(`[QualityScore] Publisher ${publisherId} not found`);
      return 70; // Default neutral score
    }

    // Check if publisher has enough data
    const performanceData = await getPerformanceData(publisherId);
    const daysActive = (Date.now() - publisherData.created_at.getTime()) / (24 * 60 * 60 * 1000);
    
    if (performanceData.total_impressions < MINIMUM_IMPRESSIONS && daysActive < MINIMUM_DAYS_ACTIVE) {
      console.log(`[QualityScore] Insufficient data for ${publisherId}. Using default score 70.`);
      return 70; // Default neutral score for new publishers
    }

    // Calculate component scores
    const trafficData = await getTrafficQualityData(publisherId);
    const trafficQualityScore = calculateTrafficQualityScore(trafficData);
    const performanceScore = await calculatePerformanceScore(performanceData);
    const domainAuthorityScore = calculateDomainAuthorityScore(publisherData);

    // Total score
    const totalScore = trafficQualityScore + performanceScore + domainAuthorityScore;
    const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));

    console.log(`[QualityScore] Publisher ${publisherId} score breakdown:`, {
      traffic_quality: Math.round(trafficQualityScore),
      performance: Math.round(performanceScore),
      domain_authority: domainAuthorityScore,
      total: finalScore,
    });

    return finalScore;

  } catch (error) {
    console.error(`[QualityScore] Error calculating score for ${publisherId}:`, error);
    return 70; // Fallback to neutral score on error
  }
}

/**
 * Update quality score in database for a publisher
 * @param publisherId - Publisher UUID
 */
export async function updatePublisherQualityScore(publisherId: string): Promise<void> {
  try {
    const score = await calculatePublisherQualityScore(publisherId);

    await dbPool.query(
      `UPDATE publishers 
       SET quality_score = $1, updated_at = NOW() 
       WHERE id = $2`,
      [score, publisherId]
    );

    // Cache the score
    const cacheKey = `quality:score:${publisherId}`;
    await cache.set(cacheKey, score, QUALITY_SCORE_CACHE_TTL);

    console.log(`[QualityScore] Updated publisher ${publisherId} score to ${score}`);
  } catch (error) {
    console.error(`[QualityScore] Error updating score for ${publisherId}:`, error);
    throw error;
  }
}

/**
 * Update quality scores for all active publishers
 * Used by daily cron job
 */
export async function updateAllPublisherQualityScores(): Promise<void> {
  try {
    console.log('[QualityScore] Starting batch quality score update...');

    // Get all active publishers
    const result = await dbPool.query(`
      SELECT id, created_at
      FROM publishers
      WHERE status IN ('approved', 'pending')
      ORDER BY created_at DESC
    `);

    console.log(`[QualityScore] Found ${result.rows.length} publishers to update`);

    let updated = 0;
    let skipped = 0;

    for (const publisher of result.rows) {
      try {
        // Check if publisher has minimum data
        const performanceData = await getPerformanceData(publisher.id);
        const daysActive = (Date.now() - new Date(publisher.created_at).getTime()) / (24 * 60 * 60 * 1000);

        if (performanceData.total_impressions < MINIMUM_IMPRESSIONS && daysActive < MINIMUM_DAYS_ACTIVE) {
          console.log(`[QualityScore] Skipping ${publisher.id} - insufficient data`);
          skipped++;
          continue;
        }

        await updatePublisherQualityScore(publisher.id);
        updated++;

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`[QualityScore] Error updating publisher ${publisher.id}:`, error);
      }
    }

    console.log(`[QualityScore] Batch update complete. Updated: ${updated}, Skipped: ${skipped}`);

  } catch (error) {
    console.error('[QualityScore] Error in batch update:', error);
    throw error;
  }
}

