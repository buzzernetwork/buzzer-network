/**
 * Authentication Routes
 * Wallet authentication and JWT token generation
 */

import { Router } from 'express';
import { dbPool } from '../config/database.js';
import {
  verifyWalletSignature,
  generateAuthMessage,
  generateToken,
  verifyToken,
} from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/v1/auth/message
 * Generate authentication message for wallet signing
 */
router.post('/message', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        error: 'Invalid wallet address',
      });
    }

    // Generate nonce (in production, store this in Redis with expiration)
    const nonce = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);

    const message = generateAuthMessage(address, nonce);

    res.json({
      message,
      nonce,
      address,
    });
  } catch (error) {
    console.error('Generate message error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/auth/verify
 * Verify wallet signature and generate JWT token
 */
router.post('/verify', async (req, res) => {
  try {
    const { address, message, signature } = req.body;

    if (!address || !message || !signature) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['address', 'message', 'signature'],
      });
    }

    // Verify signature
    const isValid = await verifyWalletSignature(address, message, signature);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid signature',
      });
    }

    // Check if user exists (publisher or advertiser)
    const publisherResult = await dbPool.query(
      'SELECT id FROM publishers WHERE wallet_address = $1',
      [address]
    );

    const advertiserResult = await dbPool.query(
      'SELECT id FROM advertisers WHERE wallet_address = $1',
      [address]
    );

    const userId = publisherResult.rows[0]?.id || advertiserResult.rows[0]?.id;

    // Generate JWT token
    const token = generateToken(address, userId);

    res.json({
      success: true,
      token,
      address,
      userId,
      userType: publisherResult.rows[0] ? 'publisher' : 
                advertiserResult.rows[0] ? 'advertiser' : 'new',
    });
  } catch (error) {
    console.error('Verify signature error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user info
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user info
    const publisherResult = await dbPool.query(
      'SELECT id, wallet_address, website_url, status FROM publishers WHERE wallet_address = $1',
      [decoded.walletAddress]
    );

    const advertiserResult = await dbPool.query(
      'SELECT id, wallet_address, company_name, status FROM advertisers WHERE wallet_address = $1',
      [decoded.walletAddress]
    );

    if (publisherResult.rows.length > 0) {
      return res.json({
        user: {
          ...publisherResult.rows[0],
          type: 'publisher',
        },
      });
    }

    if (advertiserResult.rows.length > 0) {
      return res.json({
        user: {
          ...advertiserResult.rows[0],
          type: 'advertiser',
        },
      });
    }

    res.json({
      user: {
        wallet_address: decoded.walletAddress,
        type: 'new',
      },
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

