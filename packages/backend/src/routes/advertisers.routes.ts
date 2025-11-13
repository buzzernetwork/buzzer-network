/**
 * Advertiser Routes
 * Advertiser registration and campaign management endpoints
 */

import { Router } from 'express';
import { dbPool } from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerAdvertiserSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  company_name: z.string().min(1),
  website_url: z.string().url().optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1),
  objective: z.enum(['awareness', 'clicks', 'conversions']),
  bid_model: z.enum(['CPM', 'CPC']),
  bid_amount: z.number().positive(),
  total_budget: z.number().positive(),
  daily_budget: z.number().positive().optional(),
  targeting: z.object({
    geo: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    quality_min: z.number().min(0).max(100).optional(),
    devices: z.array(z.string()).optional(),
  }),
  creative_url: z.string().url(),
  creative_format: z.enum(['banner', 'native', 'video']),
  landing_page_url: z.string().url(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

/**
 * POST /api/v1/advertisers
 * Register a new advertiser
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validation = registerAdvertiserSchema.safeParse({
      ...req.body,
      wallet_address: walletAddress,
    });

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { company_name, website_url } = validation.data;

    // Check if advertiser already exists
    const existing = await dbPool.query(
      'SELECT id FROM advertisers WHERE wallet_address = $1',
      [walletAddress]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Advertiser already exists',
        advertiser_id: existing.rows[0].id,
      });
    }

    // Create advertiser
    const result = await dbPool.query(
      `INSERT INTO advertisers (wallet_address, company_name, website_url)
       VALUES ($1, $2, $3)
       RETURNING id, wallet_address, company_name, status, created_at`,
      [walletAddress, company_name, website_url || null]
    );

    res.status(201).json({
      success: true,
      advertiser: result.rows[0],
    });
  } catch (error) {
    console.error('Advertiser registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/advertisers/campaigns
 * Create a new campaign
 */
router.post('/campaigns', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get advertiser ID
    const advertiserResult = await dbPool.query(
      'SELECT id FROM advertisers WHERE wallet_address = $1',
      [walletAddress]
    );

    if (advertiserResult.rows.length === 0) {
      return res.status(404).json({ error: 'Advertiser not found. Please register first.' });
    }

    const advertiserId = advertiserResult.rows[0].id;

    // Validate campaign data
    const validation = createCampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const campaignData = validation.data;

    // Create campaign
    const result = await dbPool.query(
      `INSERT INTO campaigns (
        advertiser_id, name, objective, bid_model, bid_amount,
        total_budget, daily_budget, targeting, creative_url,
        creative_format, landing_page_url, start_date, end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
      RETURNING id, name, objective, bid_model, bid_amount, status, created_at`,
      [
        advertiserId,
        campaignData.name,
        campaignData.objective,
        campaignData.bid_model,
        campaignData.bid_amount.toString(),
        campaignData.total_budget.toString(),
        campaignData.daily_budget?.toString() || null,
        JSON.stringify(campaignData.targeting),
        campaignData.creative_url,
        campaignData.creative_format,
        campaignData.landing_page_url,
        campaignData.start_date || null,
        campaignData.end_date || null,
      ]
    );

    res.status(201).json({
      success: true,
      campaign: result.rows[0],
      message: 'Campaign created. Fund the campaign to activate.',
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/advertisers/campaigns
 * Get all campaigns for current advertiser
 */
router.get('/campaigns', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await dbPool.query(
      `SELECT 
        c.id, c.name, c.objective, c.bid_model, c.bid_amount,
        c.total_budget, c.spent_budget, c.status, c.targeting,
        c.creative_url, c.creative_format, c.created_at
       FROM campaigns c
       JOIN advertisers a ON c.advertiser_id = a.id
       WHERE a.wallet_address = $1
       ORDER BY c.created_at DESC`,
      [walletAddress]
    );

    res.json({
      campaigns: result.rows,
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/v1/advertisers/campaigns/:id
 * Update campaign (pause, resume, update budget)
 */
router.patch('/campaigns/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;
    const { status, total_budget, daily_budget } = req.body;

    // Verify ownership
    const campaignResult = await dbPool.query(
      `SELECT c.id FROM campaigns c
       JOIN advertisers a ON c.advertiser_id = a.id
       WHERE c.id = $1 AND a.wallet_address = $2`,
      [id, walletAddress]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (total_budget !== undefined) {
      updates.push(`total_budget = $${paramIndex++}`);
      values.push(total_budget.toString());
    }
    if (daily_budget !== undefined) {
      updates.push(`daily_budget = $${paramIndex++}`);
      values.push(daily_budget?.toString() || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await dbPool.query(
      `UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, status, total_budget, daily_budget`,
      values
    );

    // Invalidate cache if status changed
    if (status) {
      const { invalidateCampaignCache } = await import('../services/matching.service.js');
      await invalidateCampaignCache();
    }

    res.json({
      success: true,
      campaign: result.rows[0],
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;




