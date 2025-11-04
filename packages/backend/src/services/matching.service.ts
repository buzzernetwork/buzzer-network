/**
 * Matching Engine Service
 * Matches ad requests with available campaigns
 */

import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';

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
  status: string;
  targeting: {
    geo?: string[];
    categories?: string[];
    quality_min?: number;
    devices?: string[];
  };
  creative_url: string;
  creative_format: string;
  landing_page_url: string;
}

/**
 * Get active campaigns from cache or database
 */
async function getActiveCampaigns(): Promise<Campaign[]> {
  const cacheKey = 'active_campaigns';
  const cached = await cache.get<Campaign[]>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const result = await dbPool.query<Campaign>(`
    SELECT 
      id, advertiser_id, name, objective, bid_model, bid_amount,
      total_budget, spent_budget, status, targeting, creative_url,
      creative_format, landing_page_url
    FROM campaigns
    WHERE status = 'active'
      AND (start_date IS NULL OR start_date <= NOW())
      AND (end_date IS NULL OR end_date >= NOW())
      AND (total_budget::numeric - spent_budget::numeric) > 0
    ORDER BY bid_amount DESC
  `);
  
  const campaigns = result.rows;
  
  // Cache for 5 minutes
  await cache.set(cacheKey, campaigns, 300);
  
  return campaigns;
}

/**
 * Filter campaigns by targeting criteria
 */
function filterByTargeting(
  campaigns: Campaign[],
  params: MatchingParams,
  publisherQualityScore: number
): Campaign[] {
  return campaigns.filter((campaign) => {
    const targeting = campaign.targeting;
    
    // Check geographic targeting
    if (targeting.geo && targeting.geo.length > 0 && params.geo) {
      if (!targeting.geo.includes(params.geo)) {
        return false;
      }
    }
    
    // Check quality score requirement
    if (targeting.quality_min && publisherQualityScore < targeting.quality_min) {
      return false;
    }
    
    // Check device targeting
    if (targeting.devices && targeting.devices.length > 0 && params.device) {
      if (!targeting.devices.includes(params.device)) {
        return false;
      }
    }
    
    // Check format match
    if (campaign.creative_format !== params.format) {
      return false;
    }
    
    // Check budget availability
    const remainingBudget = parseFloat(campaign.total_budget) - parseFloat(campaign.spent_budget);
    if (remainingBudget <= 0) {
      return false;
    }
    
    return true;
  });
}

/**
 * Rank campaigns by bid amount (highest first)
 */
function rankByBid(campaigns: Campaign[]): Campaign[] {
  return campaigns.sort((a, b) => {
    const bidA = parseFloat(a.bid_amount);
    const bidB = parseFloat(b.bid_amount);
    return bidB - bidA; // Descending order
  });
}

/**
 * Match campaigns for ad request
 */
export async function matchCampaigns(params: MatchingParams): Promise<Campaign[]> {
  try {
    // Get publisher quality score (default to 70 for MVP)
    const publisherResult = await dbPool.query<{ quality_score: number }>(
      'SELECT quality_score FROM publishers WHERE id = $1',
      [params.publisherId]
    );
    
    const publisherQualityScore = publisherResult.rows[0]?.quality_score || 70;
    
    // Get active campaigns
    const activeCampaigns = await getActiveCampaigns();
    
    // Filter by targeting
    const filteredCampaigns = filterByTargeting(activeCampaigns, params, publisherQualityScore);
    
    // Rank by bid amount
    const rankedCampaigns = rankByBid(filteredCampaigns);
    
    // Return top campaigns (for now, return top 1)
    return rankedCampaigns.slice(0, 1);
  } catch (error) {
    console.error('Matching engine error:', error);
    return [];
  }
}

/**
 * Invalidate campaign cache (call when campaign is updated)
 */
export async function invalidateCampaignCache(): Promise<void> {
  await cache.del('active_campaigns');
}

