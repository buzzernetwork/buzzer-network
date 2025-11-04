/**
 * X402 Protocol Routes
 * Ad serving endpoint compliant with X402 protocol
 */

import { Router } from 'express';
import { x402Middleware } from '../middleware/x402.middleware.js';
import { matchCampaigns } from '../services/matching.service.js';

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
router.get('/x402/ad', x402Middleware, async (req, res) => {
  try {
    const { pub_id, slot_id, format, geo, device } = req.query;
    
    // Validate required parameters
    if (!pub_id || !slot_id || !format) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['pub_id', 'slot_id', 'format'],
        received: { pub_id, slot_id, format },
      });
    }
    
    // Validate format
    const validFormats = ['banner', 'native', 'video'];
    if (!validFormats.includes(format as string)) {
      return res.status(400).json({
        error: 'Invalid format',
        valid_formats: validFormats,
        received: format,
      });
    }
    
    // Match campaigns using matching engine
    const matchedCampaigns = await matchCampaigns({
      publisherId: pub_id as string,
      slotId: slot_id as string,
      format: format as string,
      geo: geo as string,
      device: device as string,
    });
    
    if (matchedCampaigns.length === 0) {
      return res.status(404).json({
        error: 'No matching campaigns',
        message: 'No active campaigns match your criteria',
      });
    }
    
    const selectedCampaign = matchedCampaigns[0];
    const adId = `AD_${selectedCampaign.id.slice(0, 8).toUpperCase()}`;
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    // Return X402-compliant response
    res.status(200).json({
      ad_id: adId,
      creative_url: selectedCampaign.creative_url,
      format: selectedCampaign.creative_format,
      width: 300, // TODO: Extract from dimensions
      height: 250,
      click_url: `${apiUrl}/track/click/${adId}`,
      impression_url: `${apiUrl}/track/impression/${adId}`,
    });
  } catch (error) {
    console.error('X402 Ad Endpoint Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

