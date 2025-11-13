/**
 * Matching Engine Service
 * Matches ad requests with available campaigns
 */

import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';
import { isBlocked } from './blocklist.service.js';
import { calculateECPMBatch } from './ecpm-calculator.service.js';
import { shouldServeCampaignProbabilistic } from './budget-pacing.service.js';
import { logger } from '../config/logger.js';
import { 
  matchingCacheHitRate, 
  matchingFilteredCampaigns, 
  matchingDuration 
} from '../middleware/metrics.middleware.js';

const matchingLogger = logger.child({ component: 'matching' });

export interface MatchingParams {
  publisherId: string;
  slotId: string;
  format: string;
  geo?: string;
  device?: string;
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  objective: string;
  bid_model: 'CPM' | 'CPC';
  bid_amount: string;
  total_budget: string;
  spent_budget: string;
  daily_budget?: string;
  status: string;
  targeting: {
    geo?: string[];
    categories?: string[];
    quality_min?: number;
    devices?: string[];
  };
  creative_url: string;
  creative_format: string;
  creative_dimensions?: string;
  landing_page_url: string;
}

/**
 * Get active campaigns from cache or database
 * Uses versioned caching for efficient invalidation
 */
async function getActiveCampaigns(): Promise<Campaign[]> {
  // Get current cache version
  const version = await cache.getVersion('campaigns:version');
  const cacheKey = `campaigns:v${version}`;
  const cached = await cache.get<Campaign[]>(cacheKey);
  
  if (cached) {
    // Track cache hit
    matchingCacheHitRate.set(100);
    return cached;
  }
  
  // Track cache miss
  matchingCacheHitRate.set(0);
  
  // Fetch from database with daily budget enforcement
  const result = await dbPool.query<Campaign>(`
    SELECT 
      c.id, c.advertiser_id, c.name, c.objective, c.bid_model, c.bid_amount,
      c.total_budget, c.spent_budget, c.daily_budget, c.status, c.targeting, c.creative_url,
      c.creative_format, c.creative_dimensions, c.landing_page_url
    FROM campaigns c
    LEFT JOIN (
      SELECT 
        campaign_id, 
        COALESCE(SUM(revenue), 0) as daily_spent
      FROM impressions
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY campaign_id
    ) daily ON c.id = daily.campaign_id
    WHERE c.status = 'active'
      AND (c.start_date IS NULL OR c.start_date <= NOW())
      AND (c.end_date IS NULL OR c.end_date >= NOW())
      AND (c.total_budget::numeric - c.spent_budget::numeric) > 0
      AND (c.daily_budget IS NULL OR COALESCE(daily.daily_spent, 0) < c.daily_budget::numeric)
    ORDER BY c.bid_amount DESC
  `);
  
  const campaigns = result.rows;
  
  // Cache for 5 minutes with current version
  await cache.set(cacheKey, campaigns, 300);
  
  return campaigns;
}

/**
 * Filter campaigns by targeting criteria
 */
async function filterByTargeting(
  campaigns: Campaign[],
  params: MatchingParams,
  publisherQualityScore: number,
  publisherCategories: string[] = []
): Promise<Campaign[]> {
  const filteredCampaigns: Campaign[] = [];
  
  for (const campaign of campaigns) {
    const targeting = campaign.targeting;
    
    // FIRST: Check brand safety blocklists (both directions)
    const blocked = await isBlocked(campaign.advertiser_id, params.publisherId);
    if (blocked) {
      continue; // Skip this campaign
    }
    
    // Check geographic targeting
    if (targeting.geo && targeting.geo.length > 0 && params.geo) {
      if (!targeting.geo.includes(params.geo)) {
        continue;
      }
    }
    
    // Check category targeting
    if (targeting.categories && targeting.categories.length > 0) {
      // Check if ANY campaign category matches publisher categories
      const hasMatch = targeting.categories.some(cat => 
        publisherCategories.includes(cat)
      );
      if (!hasMatch) {
        continue; // Publisher doesn't match required categories
      }
    }
    
    // Check quality score requirement
    if (targeting.quality_min && publisherQualityScore < targeting.quality_min) {
      continue;
    }
    
    // Check device targeting
    if (targeting.devices && targeting.devices.length > 0 && params.device) {
      if (!targeting.devices.includes(params.device)) {
        continue;
      }
    }
    
    // Check format match
    if (campaign.creative_format !== params.format) {
      continue;
    }
    
    // Check budget availability
    const remainingBudget = parseFloat(campaign.total_budget) - parseFloat(campaign.spent_budget);
    if (remainingBudget <= 0) {
      continue;
    }
    
    // Check hourly pacing if daily budget is set
    if (campaign.daily_budget) {
      const dailyBudget = parseFloat(campaign.daily_budget);
      const shouldServe = await shouldServeCampaignProbabilistic(campaign.id, dailyBudget);
      if (!shouldServe) {
        continue; // Throttled due to pacing
      }
    }
    
    // All checks passed, include this campaign
    filteredCampaigns.push(campaign);
  }
  
  return filteredCampaigns;
}

/**
 * Rank campaigns by predicted eCPM (highest first)
 * Uses historical CTR data to optimize publisher revenue
 */
async function rankByECPM(campaigns: Campaign[]): Promise<Campaign[]> {
  // Calculate eCPM for all campaigns
  const campaignsWithECPM = await calculateECPMBatch(campaigns);
  
  // Sort by eCPM descending
  return campaignsWithECPM.sort((a, b) => b.ecpm - a.ecpm);
}

/**
 * Match campaigns for ad request
 * @param maxResults Maximum number of campaigns to return (default: 3 for A/B testing)
 */
export async function matchCampaigns(
  params: MatchingParams,
  maxResults: number = 3
): Promise<Campaign[]> {
  const startTime = Date.now();
  
  try {
    // Get publisher quality score and categories
    const publisherResult = await dbPool.query<{ 
      quality_score: number;
      categories: string[];
    }>(
      'SELECT quality_score, categories FROM publishers WHERE id = $1',
      [params.publisherId]
    );
    
    const publisherQualityScore = publisherResult.rows[0]?.quality_score || 70;
    const publisherCategories = publisherResult.rows[0]?.categories || [];
    
    // Get slot configuration for floor price and size filtering
    const slotResult = await dbPool.query(
      'SELECT sizes, floor_price, primary_size FROM ad_slots WHERE slot_id = $1',
      [params.slotId]
    );
    
    const slot = slotResult.rows[0];
    const acceptedSizes = slot?.sizes ? JSON.parse(slot.sizes) : [];
    const floorPrice = slot?.floor_price ? parseFloat(slot.floor_price) : 0;
    
    // Get active campaigns
    let activeCampaigns = await getActiveCampaigns();
    matchingFilteredCampaigns.labels('initial', params.publisherId).observe(activeCampaigns.length);
    
    // Filter by creative size if slot has size requirements
    if (acceptedSizes.length > 0) {
      activeCampaigns = activeCampaigns.filter(campaign => {
        const creativeDimensions = campaign.creative_dimensions || '300x250';
        return acceptedSizes.includes(creativeDimensions);
      });
      matchingFilteredCampaigns.labels('size_filter', params.publisherId).observe(activeCampaigns.length);
    }
    
    // Filter by floor price
    if (floorPrice > 0) {
      activeCampaigns = activeCampaigns.filter(campaign => {
        return parseFloat(campaign.bid_amount) >= floorPrice;
      });
      matchingFilteredCampaigns.labels('floor_price', params.publisherId).observe(activeCampaigns.length);
    }
    
    // Filter by targeting (now async due to blocklist checks)
    const filteredCampaigns = await filterByTargeting(
      activeCampaigns, 
      params, 
      publisherQualityScore,
      publisherCategories
    );
    matchingFilteredCampaigns.labels('targeting', params.publisherId).observe(filteredCampaigns.length);
    
    // Rank by predicted eCPM (optimizes publisher revenue)
    const rankedCampaigns = await rankByECPM(filteredCampaigns);
    matchingFilteredCampaigns.labels('final', params.publisherId).observe(rankedCampaigns.length);
    
    // Track total matching duration
    const duration = Date.now() - startTime;
    matchingDuration.labels(params.publisherId).observe(duration);
    
    // Return top N campaigns for A/B testing
    return rankedCampaigns.slice(0, maxResults);
  } catch (error) {
    matchingLogger.error('Campaign matching failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        publisherId: params.publisherId,
        slotId: params.slotId,
        format: params.format,
        geo: params.geo,
        device: params.device,
      },
    });
    return [];
  }
}

/**
 * Invalidate campaign cache (call when campaign is updated)
 * Uses version increment instead of deletion for efficiency
 */
export async function invalidateCampaignCache(): Promise<void> {
  await cache.incrVersion('campaigns:version');
}




