/**
 * Publisher Routes
 * Publisher registration and management endpoints
 */

import { Router } from 'express';
import { dbPool } from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { verifyDNS, verifyHTML, verifyFile, generateVerificationToken } from '../services/domain-verification.service.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerPublisherSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  email: z.string().email().optional(),
  website_url: z.string().url(),
  payment_wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payment wallet address'),
});

/**
 * POST /api/v1/publishers
 * Register a new publisher
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const validation = registerPublisherSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    const { website_url, email, payment_wallet } = validation.data;

    // Check if publisher already exists
    const existing = await dbPool.query(
      'SELECT id FROM publishers WHERE wallet_address = $1',
      [walletAddress]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Publisher already exists',
        publisher_id: existing.rows[0].id,
      });
    }

    // Create publisher
    const result = await dbPool.query(
      `INSERT INTO publishers 
       (wallet_address, email, website_url, payment_wallet, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, wallet_address, website_url, status, quality_score, created_at`,
      [walletAddress, email || null, website_url, payment_wallet]
    );

    res.status(201).json({
      success: true,
      publisher: result.rows[0],
      message: 'Publisher registered successfully. Domain verification required.',
    });
  } catch (error) {
    console.error('Publisher registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/me
 * Get current publisher's information
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await dbPool.query(
      `SELECT 
        id, wallet_address, email, website_url, domain_verified,
        quality_score, status, payment_wallet, created_at, updated_at
       FROM publishers
       WHERE wallet_address = $1`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    res.json({ publisher: result.rows[0] });
  } catch (error) {
    console.error('Get publisher error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:id/verification-token
 * Get verification token for domain verification
 */
router.get('/:id/verification-token', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;

    // Verify ownership
    const publisher = await dbPool.query(
      'SELECT id, wallet_address, website_url FROM publishers WHERE id = $1',
      [id]
    );

    if (publisher.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    if (publisher.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const token = generateVerificationToken(id, walletAddress || '');

    // Extract hostname safely
    let hostname: string;
    try {
      hostname = new URL(publisher.rows[0].website_url).hostname;
    } catch {
      hostname = publisher.rows[0].website_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    res.json({
      verification_token: token,
      instructions: {
        dns: `Add DNS TXT record: _buzzer-verify.${hostname} = ${token}`,
        html: `Add HTML meta tag: <meta name="buzzer-verification" content="${token}">`,
        file: `Upload file buzzer-verification.txt to your website root with content: ${token}`,
      },
    });
  } catch (error) {
    console.error('Get verification token error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/publishers/:id/verify
 * Verify domain ownership using DNS, HTML, or file method
 */
router.post('/:id/verify', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;
    const { verification_method, verification_token } = req.body; // 'dns', 'html', 'file'

    if (!verification_method || !['dns', 'html', 'file'].includes(verification_method)) {
      return res.status(400).json({
        error: 'Invalid verification method',
        methods: ['dns', 'html', 'file'],
      });
    }

    // Verify ownership
    const publisher = await dbPool.query(
      'SELECT id, wallet_address, website_url FROM publishers WHERE id = $1',
      [id]
    );

    if (publisher.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    if (publisher.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const websiteUrl = publisher.rows[0].website_url;
    const expectedToken = verification_token || generateVerificationToken(id, walletAddress || '');

    // Perform verification based on method
    let result;
    switch (verification_method) {
      case 'dns':
        result = await verifyDNS(websiteUrl, expectedToken);
        break;
      case 'html':
        result = await verifyHTML(websiteUrl, expectedToken);
        break;
      case 'file':
        result = await verifyFile(websiteUrl, 'buzzer-verification.txt', expectedToken);
        break;
      default:
        return res.status(400).json({ error: 'Invalid verification method' });
    }

    if (result.success) {
      // Update publisher status
      await dbPool.query(
        'UPDATE publishers SET domain_verified = TRUE, status = \'approved\', updated_at = NOW() WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: result.message,
        verified: true,
        method: result.method,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        verified: false,
        method: result.method,
      });
    }
  } catch (error) {
    console.error('Domain verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:id/earnings
 * Get publisher earnings
 */
router.get('/:id/earnings', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Verify ownership
    const publisher = await dbPool.query(
      'SELECT wallet_address FROM publishers WHERE id = $1',
      [id]
    );

    if (publisher.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    if (publisher.rows[0].wallet_address.toLowerCase() !== walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Calculate earnings from impressions and clicks
    let query = `
      SELECT 
        COALESCE(SUM(revenue), 0) as total_earnings,
        COUNT(*) FILTER (WHERE revenue IS NOT NULL) as event_count
      FROM (
        SELECT revenue FROM impressions WHERE publisher_id = $1
        ${start_date ? 'AND timestamp >= $2' : ''}
        ${end_date ? `AND timestamp <= ${start_date ? '$3' : '$2'}` : ''}
        UNION ALL
        SELECT revenue FROM clicks WHERE publisher_id = $1
        ${start_date ? 'AND timestamp >= $2' : ''}
        ${end_date ? `AND timestamp <= ${start_date ? '$3' : '$2'}` : ''}
      ) AS events
    `;

    const params: any[] = [id];
    if (start_date) params.push(start_date);
    if (end_date) params.push(end_date);

    const earningsResult = await dbPool.query(query, params);

    res.json({
      publisher_id: id,
      earnings: {
        total: parseFloat(earningsResult.rows[0].total_earnings || '0'),
        event_count: parseInt(earningsResult.rows[0].event_count || '0'),
      },
      period: {
        start: start_date || null,
        end: end_date || null,
      },
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

