/**
 * eCPM Calculator Service
 * Calculates effective CPM based on historical performance data
 */

import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';
import type { Campaign } from './matching.service.js';

const MINIMUM_IMPRESSIONS = 1000;
const DEFAULT_CTR = 0.001; // 0.1% default CTR
const CTR_CACHE_TTL = 21600; // 6 hours

/**
 * Calculate historical click-through rate for a campaign
 * @param campaignId - Campaign UUID
 * @param days - Number of days to look back (default: 30)
 * @returns CTR as decimal (e.g., 0.005 for 0.5%)
 */
export async function calculateHistoricalCTR(
  campaignId: string,
  days: number = 30
): Promise<number> {
  const cacheKey = `ctr:${campaignId}:${days}d`;
  const cached = await cache.get<number>(cacheKey);
  
  if (cached !== null) {
    return cached;
  }
  
  try {
    // Get impressions and clicks for the last N days
    const result = await dbPool.query(
      `SELECT 
        (SELECT COUNT(*) FROM impressions 
         WHERE campaign_id = $1 
         AND created_at >= NOW() - INTERVAL '${days} days') as impressions,
        (SELECT COUNT(*) FROM clicks 
         WHERE campaign_id = $1 
         AND created_at >= NOW() - INTERVAL '${days} days') as clicks`,
      [campaignId]
    );
    
    const { impressions, clicks } = result.rows[0];
    const impressionCount = parseInt(impressions, 10);
    const clickCount = parseInt(clicks, 10);
    
    // If insufficient data, return default CTR
    if (impressionCount < MINIMUM_IMPRESSIONS) {
      await cache.set(cacheKey, DEFAULT_CTR, CTR_CACHE_TTL);
      return DEFAULT_CTR;
    }
    
    // Calculate CTR
    const ctr = clickCount / impressionCount;
    
    // Cache the result
    await cache.set(cacheKey, ctr, CTR_CACHE_TTL);
    
    return ctr;
  } catch (error) {
    console.error('CTR calculation error:', error);
    return DEFAULT_CTR;
  }
}

/**
 * Calculate effective CPM (eCPM) for a campaign
 * @param campaign - Campaign object
 * @param ctr - Historical CTR (optional, will be fetched if not provided)
 * @returns Predicted eCPM value
 */
export async function calculateECPM(
  campaign: Campaign,
  ctr?: number
): Promise<number> {
  // Get CTR if not provided
  const historicalCTR = ctr ?? await calculateHistoricalCTR(campaign.id);
  
  const bidAmount = parseFloat(campaign.bid_amount);
  
  if (campaign.bid_model === 'CPM') {
    // For CPM campaigns, boost eCPM based on CTR performance
    // High-performing campaigns get a bonus (up to 20%)
    const ctrBoost = Math.min(historicalCTR / DEFAULT_CTR, 1.2);
    return bidAmount * ctrBoost;
  } else if (campaign.bid_model === 'CPC') {
    // For CPC campaigns, calculate expected eCPM
    // eCPM = CPC * CTR * 1000 impressions
    return bidAmount * historicalCTR * 1000;
  }
  
  // Fallback to bid amount
  return bidAmount;
}

/**
 * Calculate eCPM for multiple campaigns in batch
 * @param campaigns - Array of campaigns
 * @returns Array of campaigns with eCPM values
 */
export async function calculateECPMBatch(
  campaigns: Campaign[]
): Promise<Array<Campaign & { ecpm: number }>> {
  // Fetch all CTRs in parallel
  const ctrPromises = campaigns.map(c => calculateHistoricalCTR(c.id));
  const ctrs = await Promise.all(ctrPromises);
  
  // Calculate eCPM for each campaign
  return campaigns.map((campaign, index) => ({
    ...campaign,
    ecpm: calculateECPMSync(campaign, ctrs[index]),
  }));
}

/**
 * Synchronous eCPM calculation (requires pre-fetched CTR)
 */
function calculateECPMSync(campaign: Campaign, ctr: number): number {
  const bidAmount = parseFloat(campaign.bid_amount);
  
  if (campaign.bid_model === 'CPM') {
    const ctrBoost = Math.min(ctr / DEFAULT_CTR, 1.2);
    return bidAmount * ctrBoost;
  } else if (campaign.bid_model === 'CPC') {
    return bidAmount * ctr * 1000;
  }
  
  return bidAmount;
}

/**
 * Invalidate CTR cache for a campaign
 */
export async function invalidateCTRCache(campaignId: string): Promise<void> {
  await Promise.all([
    cache.del(`ctr:${campaignId}:7d`),
    cache.del(`ctr:${campaignId}:30d`),
    cache.del(`ctr:${campaignId}:90d`),
  ]);
}

