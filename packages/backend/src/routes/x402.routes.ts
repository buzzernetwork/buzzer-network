/**
 * X402 Protocol Routes
 * Ad serving endpoint compliant with X402 protocol
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { x402Middleware } from '../middleware/x402.middleware.js';
import { matchCampaigns } from '../services/matching.service.js';
import { dbPool } from '../config/database.js';
import { adServingRateLimiter } from '../middleware/rate-limiter.middleware.js';
import { adLogger } from '../config/logger.js';
import { adServeCounter, campaignMatchDuration } from '../middleware/metrics.middleware.js';
import { extractClientIP, getGeoFromIP } from '../services/geo-ip.service.js';
import { checkFrequencyCap } from '../services/frequency-cap.service.js';
import { trackAdRequest } from '../services/ad-request-tracking.service.js';
import { shouldRouteToBuzzer, getDualRunningConfig, trackDualRunningMetrics } from '../services/dual-running.service.js';

const router = Router();

/**
 * GET /x402/ad
 * X402-compliant ad serving endpoint
 * 
 * Query Parameters:
 * - pub_id: Publisher ID (required)
 * - slot_id: Ad slot ID (required)
 * - format: Ad format - banner/native/video (required)
 * - geo: Country code (optional)
 * - device: desktop/mobile/tablet (optional)
 * 
 * Response (200 OK):
 * {
 *   "ad_id": "AD_XXX",
 *   "creative_url": "https://...",
 *   "format": "banner",
 *   "width": 300,
 *   "height": 250,
 *   "click_url": "https://...",
 *   "impression_url": "https://..."
 * }
 * 
 * Response (402 Payment Required):
 * {
 *   "error": "Payment Required",
 *   "payment_address": "0x...",
 *   "amount": "0.001",
 *   "token": "ETH",
 *   "x402_payment_url": "https://..."
 * }
 */
router.get('/x402/ad', adServingRateLimiter, x402Middleware, async (req, res) => {
  try {
    const { pub_id, slot_id, format, geo, device } = req.query;
    
    // Validate required parameters
    if (!pub_id || !slot_id || !format) {
      // Track unfilled request
      if (pub_id && slot_id && format) {
        trackAdRequest({
          publisherId: pub_id as string,
          slotId: slot_id as string,
          format: format as string,
          geo: geo as string,
          device: device as string,
          filled: false,
          reason: 'error',
        }).catch(err => console.error('Failed to track ad request:', err));
      }
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['pub_id', 'slot_id', 'format'],
        received: { pub_id, slot_id, format },
      });
    }
    
    // Validate format
    const validFormats = ['banner', 'native', 'video'];
    if (!validFormats.includes(format as string)) {
      // Track unfilled request
      trackAdRequest({
        publisherId: pub_id as string,
        slotId: slot_id as string,
        format: format as string,
        geo: geo as string,
        device: device as string,
        filled: false,
        reason: 'error',
      }).catch(err => console.error('Failed to track ad request:', err));
      return res.status(400).json({
        error: 'Invalid format',
        valid_formats: validFormats,
        received: format,
      });
    }
    
    // NEW: Validate slot exists and is active
    const slotResult = await dbPool.query(
      'SELECT * FROM ad_slots WHERE slot_id = $1 AND publisher_id = $2 AND status = $3',
      [slot_id, pub_id, 'active']
    );
    
    if (slotResult.rows.length === 0) {
      // Track unfilled request
      trackAdRequest({
        publisherId: pub_id as string,
        slotId: slot_id as string,
        format: format as string,
        geo: geo as string,
        device: device as string,
        filled: false,
        reason: 'error',
      }).catch(err => console.error('Failed to track ad request:', err));
      return res.status(404).json({ 
        error: 'Slot not found or inactive',
        message: 'The requested ad slot does not exist or is not active'
      });
    }
    
    const slot = slotResult.rows[0];
    
    // NEW: Verify publisher has verified domain
    const publisherResult = await dbPool.query(
      `SELECT EXISTS(
        SELECT 1 FROM publisher_domains 
        WHERE publisher_id = $1 AND domain_verified = true
      ) as has_verified`,
      [pub_id]
    );
    
    if (!publisherResult.rows[0].has_verified) {
      // Track unfilled request
      trackAdRequest({
        publisherId: pub_id as string,
        slotId: slot_id as string,
        format: format as string,
        geo: geo as string,
        device: device as string,
        filled: false,
        reason: 'blocked',
      }).catch(err => console.error('Failed to track ad request:', err));
      return res.status(403).json({ 
        error: 'Publisher domain not verified',
        message: 'At least one domain must be verified before serving ads'
      });
    }
    
    // Auto-detect geo if not provided
    let geoParam = geo as string;
    if (!geoParam) {
      const clientIP = extractClientIP(req);
      const geoData = await getGeoFromIP(clientIP);
      geoParam = geoData.country || '';
      
      if (geoParam) {
        adLogger.debug('Auto-detected geo from IP', { 
          publisher_id: pub_id,
          ip: clientIP, 
          country: geoParam 
        });
      }
    }
    
    // NEW: Check traffic splitting (dual-running)
    const dualRunningConfig = await getDualRunningConfig(slot_id as string);
    if (dualRunningConfig && !shouldRouteToBuzzer(dualRunningConfig.buzzer_traffic_percent, slot_id as string)) {
      // Route to fallback network
      if (dualRunningConfig.fallback_enabled && dualRunningConfig.fallback_code) {
        // Track fallback request
        trackDualRunningMetrics(slot_id as string, 'fallback', {
          impressions: 1,
          fill_rate: 1.0,
        }).catch(err => console.error('Failed to track fallback metrics:', err));
        
        return res.status(200).json({
          route_to_fallback: true,
          fallback_network: dualRunningConfig.fallback_network,
          fallback_code: dualRunningConfig.fallback_code,
          message: 'Traffic routed to fallback network per dual-running configuration',
        });
      } else {
        // No fallback configured - return no fill
        trackAdRequest({
          publisherId: pub_id as string,
          slotId: slot_id as string,
          format: format as string,
          geo: geoParam,
          device: device as string,
          filled: false,
          reason: 'no_match',
        }).catch(err => console.error('Failed to track ad request:', err));
        
        return res.status(404).json({
          error: 'No ad available',
          message: 'Traffic split configured but no fallback network enabled',
        });
      }
    }
    
    // Match campaigns using matching engine (request top 3 for A/B testing)
    // Matching service already handles floor price and size filtering
    let matchedCampaigns = await matchCampaigns({
      publisherId: pub_id as string,
      slotId: slot_id as string,
      format: format as string,
      geo: geoParam,
      device: device as string,
    }, 3);
    
    // Filter by frequency cap (3 impressions per day per user)
    const freqFilteredCampaigns = [];
    for (const campaign of matchedCampaigns) {
      const allowed = await checkFrequencyCap(req, campaign.id, 3);
      if (allowed) {
        freqFilteredCampaigns.push(campaign);
      }
    }
    matchedCampaigns = freqFilteredCampaigns;
    
    if (matchedCampaigns.length === 0) {
      // Check if fallback should be used
      if (dualRunningConfig?.fallback_enabled && dualRunningConfig.fallback_code) {
        // Track fallback request (no fill from Buzzer)
        trackDualRunningMetrics(slot_id as string, 'fallback', {
          impressions: 1,
          fill_rate: 1.0,
        }).catch(err => console.error('Failed to track fallback metrics:', err));
        
        trackAdRequest({
          publisherId: pub_id as string,
          slotId: slot_id as string,
          format: format as string,
          geo: geoParam,
          device: device as string,
          filled: false,
          reason: 'no_match',
        }).catch(err => console.error('Failed to track ad request:', err));
        
        return res.status(200).json({
          route_to_fallback: true,
          fallback_network: dualRunningConfig.fallback_network,
          fallback_code: dualRunningConfig.fallback_code,
          message: 'No Buzzer campaigns available, routing to fallback network',
        });
      }
      
      // Track unfilled request
      trackAdRequest({
        publisherId: pub_id as string,
        slotId: slot_id as string,
        format: format as string,
        geo: geoParam,
        device: device as string,
        filled: false,
        reason: 'no_match',
      }).catch(err => console.error('Failed to track ad request:', err));
      return res.status(404).json({
        error: 'No matching campaigns',
        message: 'No active campaigns match your criteria',
      });
    }
    
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    // Return multiple campaigns for client-side A/B testing
    // Generate unique impression ID for each ad (IAB standard)
    const ads = matchedCampaigns.map(campaign => {
      const impressionId = randomUUID(); // Unique per impression
      const creativeDimensions = campaign.creative_dimensions || slot.primary_size || '300x250';
      const [width, height] = creativeDimensions.split('x').map(Number);
      
      // Google Transparent Click Tracker requirement: visible url parameter showing next hop
      const landingPageUrl = campaign.landing_page_url || '';
      const clickUrl = `${apiUrl}/track/click/${impressionId}?campaign_id=${campaign.id}&publisher_id=${pub_id}&slot_id=${slot_id}&url=${encodeURIComponent(landingPageUrl)}`;
      
      return {
        impression_id: impressionId, // Unique identifier for this specific impression
        campaign_id: campaign.id,
        creative_url: campaign.creative_url,
        format: campaign.creative_format,
        width: width || 300,
        height: height || 250,
        bid_amount: parseFloat(campaign.bid_amount), // For weighted selection
        click_url: clickUrl,
        impression_url: `${apiUrl}/track/impression/${impressionId}`,
      };
    });
    
    // Track successful ad request (filled)
    trackAdRequest({
      publisherId: pub_id as string,
      slotId: slot_id as string,
      format: format as string,
      geo: geoParam,
      device: device as string,
      filled: true,
      campaignId: matchedCampaigns[0].id, // Top campaign
    }).catch(err => console.error('Failed to track ad request:', err));
    
    // Track dual-running metrics for Buzzer
    if (dualRunningConfig) {
      const topBid = parseFloat(matchedCampaigns[0].bid_amount);
      const ecpm = matchedCampaigns[0].bid_model === 'CPM' ? topBid : topBid * 0.02 * 1000; // Estimate for CPC
      
      trackDualRunningMetrics(slot_id as string, 'buzzer', {
        impressions: 1,
        fill_rate: 1.0,
        ecpm: ecpm,
      }).catch(err => console.error('Failed to track dual-running metrics:', err));
    }
    
    // Log successful ad serve
    adServeCounter.labels(pub_id as string, 'success', format as string).inc();
    adLogger.info('Ads served successfully', {
      publisher_id: pub_id,
      slot_id,
      num_ads: ads.length,
      campaign_ids: matchedCampaigns.map(c => c.id),
      format,
      top_bid: matchedCampaigns[0].bid_amount,
    });
    
    // Return X402-compliant response with multiple ads
    res.status(200).json({
      ads, // Array of ad options
      selection_strategy: 'weighted', // Client can use bid_amount for weighted random selection
      recommended_ad: ads[0], // Highest bidder as default recommendation
    });
  } catch (error) {
    const { pub_id, slot_id, format } = req.query;
    adLogger.error('X402 Ad Endpoint Error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      pub_id: pub_id as string,
      slot_id: slot_id as string,
      format: format as string,
    });
    adServeCounter.labels((pub_id as string) || 'unknown', 'error', (format as string) || 'unknown').inc();
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

