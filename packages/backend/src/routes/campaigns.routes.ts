/**
 * Campaign Routes
 * Campaign funding and management endpoints
 */

import { Router } from 'express';
import { dbPool } from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prepareCampaignFunding, getCampaignBalance, getCampaignSpent } from '../services/contract.service.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const fundCampaignSchema = z.object({
  campaign_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  token_address: z.string().optional(),
});

/**
 * POST /api/v1/campaigns/fund
 * Prepare campaign funding transaction
 * Returns transaction data for frontend to execute with wallet
 */
router.post('/fund', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validation = fundCampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { campaign_id, amount, token_address } = validation.data;

    // Verify campaign ownership
    const campaignResult = await dbPool.query(
      `SELECT c.id, c.advertiser_id, c.status, a.wallet_address
       FROM campaigns c
       JOIN advertisers a ON c.advertiser_id = a.id
       WHERE c.id = $1 AND a.wallet_address = $2`,
      [campaign_id, walletAddress]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Prepare funding transaction
    const txData = await prepareCampaignFunding(
      campaign_id,
      amount,
      token_address || '0x0000000000000000000000000000000000000001'
    );

    // Update campaign budget in database
    await dbPool.query(
      `UPDATE campaigns 
       SET total_budget = total_budget + $1,
           status = CASE WHEN status = 'draft' THEN 'active' ELSE status END
       WHERE id = $2`,
      [amount, campaign_id]
    );

    res.json({
      success: true,
      transaction: txData,
      message: 'Funding transaction prepared. Execute with your wallet.',
    });
  } catch (error) {
    console.error('Campaign funding error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/campaigns/:id/balance
 * Get campaign balance from smart contract
 */
router.get('/:id/balance', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;

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

    // Get balance from contract
    const balance = await getCampaignBalance(id);
    const spent = await getCampaignSpent(id);

    res.json({
      campaign_id: id,
      balance,
      spent,
      remaining: (parseFloat(balance) - parseFloat(spent)).toString(),
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/campaigns/:id
 * Get campaign details
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;

    const result = await dbPool.query(
      `SELECT 
        c.id, c.name, c.objective, c.bid_model, c.bid_amount,
        c.total_budget, c.spent_budget, c.daily_budget, c.status,
        c.targeting, c.creative_url, c.creative_format,
        c.landing_page_url, c.start_date, c.end_date,
        c.created_at, c.updated_at,
        a.company_name as advertiser_name
       FROM campaigns c
       JOIN advertisers a ON c.advertiser_id = a.id
       WHERE c.id = $1 AND a.wallet_address = $2`,
      [id, walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = result.rows[0];
    
    // Get on-chain balance
    try {
      const balance = await getCampaignBalance(id);
      const spent = await getCampaignSpent(id);
      campaign.on_chain_balance = balance;
      campaign.on_chain_spent = spent;
    } catch (error) {
      // If contract not deployed, skip
      console.log('Contract balance not available:', error);
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;




