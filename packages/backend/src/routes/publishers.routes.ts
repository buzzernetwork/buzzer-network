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
  email: z.string().email().optional(),
  website_url: z.string().url(),
  payment_wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payment wallet address'),
});

/**
 * POST /api/v1/publishers
 * Register a new publisher or add domain to existing publisher
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

    let publisherId: string;
    let isNewPublisher = false;

    if (existing.rows.length > 0) {
      // Publisher exists - add domain to existing account
      publisherId = existing.rows[0].id;

      // Check if domain already exists for this publisher
      const domainExists = await dbPool.query(
        'SELECT id FROM publisher_domains WHERE publisher_id = $1 AND website_url = $2',
        [publisherId, website_url]
      );

      if (domainExists.rows.length > 0) {
        return res.status(409).json({
          error: 'Domain already exists for this publisher',
          publisher_id: publisherId,
          domain_id: domainExists.rows[0].id,
        });
      }

      // Add domain to existing publisher
      await dbPool.query(
        `INSERT INTO publisher_domains 
         (publisher_id, website_url, status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [publisherId, website_url]
      );
    } else {
      // Create new publisher
      isNewPublisher = true;
      const result = await dbPool.query(
        `INSERT INTO publishers 
         (wallet_address, email, payment_wallet, status, quality_score)
         VALUES ($1, $2, $3, 'pending', 70)
         RETURNING id, wallet_address, status, quality_score, created_at`,
        [walletAddress, email || null, payment_wallet]
      );

      publisherId = result.rows[0].id;

      // Create first domain
      await dbPool.query(
        `INSERT INTO publisher_domains 
         (publisher_id, website_url, status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [publisherId, website_url]
      );
    }

    // Get publisher with domains
    const publisherResult = await dbPool.query(
      `SELECT 
        p.id, p.wallet_address, p.email, p.quality_score, p.status, 
        p.payment_wallet, p.created_at, p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pd.id,
              'website_url', pd.website_url,
              'domain_verified', pd.domain_verified,
              'status', pd.status,
              'created_at', pd.created_at
            )
          ) FILTER (WHERE pd.id IS NOT NULL),
          '[]'::json
        ) as domains
       FROM publishers p
       LEFT JOIN publisher_domains pd ON p.id = pd.publisher_id
       WHERE p.id = $1
       GROUP BY p.id`,
      [publisherId]
    );

    const publisher = publisherResult.rows[0];
    publisher.domains = publisher.domains || [];

    res.status(isNewPublisher ? 201 : 200).json({
      success: true,
      publisher,
      message: isNewPublisher 
        ? 'Publisher registered successfully. Domain verification required.'
        : 'Domain added successfully. Domain verification required.',
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
 * Get current publisher's information with domains
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await dbPool.query(
      `SELECT 
        p.id, p.wallet_address, p.email, p.quality_score, p.status, 
        p.payment_wallet, p.created_at, p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pd.id,
              'website_url', pd.website_url,
              'domain_verified', pd.domain_verified,
              'status', pd.status,
              'verification_attempts', pd.verification_attempts,
              'next_verification_at', pd.next_verification_at,
              'verification_error', pd.verification_error,
              'last_verification_attempt', pd.last_verification_attempt,
              'created_at', pd.created_at,
              'updated_at', pd.updated_at
            )
          ) FILTER (WHERE pd.id IS NOT NULL),
          '[]'::json
        ) as domains
       FROM publishers p
       LEFT JOIN publisher_domains pd ON p.id = pd.publisher_id
       WHERE p.wallet_address = $1
       GROUP BY p.id`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    const publisher = result.rows[0];
    publisher.domains = publisher.domains || [];

    res.json({ publisher });
  } catch (error) {
    console.error('Get publisher error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:id/domains
 * Get all domains for a publisher
 */
router.get('/:id/domains', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;

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

    const domains = await dbPool.query(
      `SELECT id, website_url, domain_verified, status, verification_token, created_at, updated_at
       FROM publisher_domains
       WHERE publisher_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ domains: domains.rows });
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/publishers/:id/domains
 * Add a new domain to existing publisher
 */
router.post('/:id/domains', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id } = req.params;
    const { website_url } = req.body;

    if (!website_url) {
      return res.status(400).json({ error: 'website_url is required' });
    }

    // Validate URL
    try {
      new URL(website_url);
    } catch {
      return res.status(400).json({ error: 'Invalid website URL' });
    }

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

    // Check if domain already exists
    const existing = await dbPool.query(
      'SELECT id FROM publisher_domains WHERE publisher_id = $1 AND website_url = $2',
      [id, website_url]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Domain already exists for this publisher',
        domain_id: existing.rows[0].id,
      });
    }

    // Add domain
    const result = await dbPool.query(
      `INSERT INTO publisher_domains 
       (publisher_id, website_url, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, website_url, domain_verified, status, created_at`,
      [id, website_url]
    );

    res.status(201).json({
      success: true,
      domain: result.rows[0],
      message: 'Domain added successfully. Domain verification required.',
    });
  } catch (error) {
    console.error('Add domain error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:id/domains/:domainId/verification-token
 * Get verification token for specific domain
 */
router.get('/:id/domains/:domainId/verification-token', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id, domainId } = req.params;

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

    // Get domain
    const domain = await dbPool.query(
      'SELECT id, website_url, verification_token FROM publisher_domains WHERE id = $1 AND publisher_id = $2',
      [domainId, id]
    );

    if (domain.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Generate or retrieve token
    let token = domain.rows[0].verification_token;
    if (!token) {
      token = generateVerificationToken(domainId, walletAddress || '');
      // Store token in database
      await dbPool.query(
        'UPDATE publisher_domains SET verification_token = $1 WHERE id = $2',
        [token, domainId]
      );
    }

    // Extract hostname safely
    let hostname: string;
    try {
      hostname = new URL(domain.rows[0].website_url).hostname;
    } catch {
      hostname = domain.rows[0].website_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
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
 * POST /api/v1/publishers/:id/domains/:domainId/verify
 * Verify specific domain ownership using DNS, HTML, or file method
 */
router.post('/:id/domains/:domainId/verify', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id, domainId } = req.params;
    const { verification_method, verification_token } = req.body; // 'dns', 'html', 'file'

    if (!verification_method || !['dns', 'html', 'file'].includes(verification_method)) {
      return res.status(400).json({
        error: 'Invalid verification method',
        methods: ['dns', 'html', 'file'],
      });
    }

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

    // Get domain
    const domain = await dbPool.query(
      'SELECT id, website_url, verification_token FROM publisher_domains WHERE id = $1 AND publisher_id = $2',
      [domainId, id]
    );

    if (domain.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const websiteUrl = domain.rows[0].website_url;
    const expectedToken = verification_token || domain.rows[0].verification_token;

    if (!expectedToken) {
      return res.status(400).json({
        error: 'Verification token required. Please get verification token first.',
      });
    }

    // Attempt immediate verification based on method
    let verified = false;
    let errorMessage = '';
    let verificationMethod = verification_method;
    
    try {
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
      
      verified = result.success;
      verificationMethod = result.method || verification_method;
      if (!verified) {
        errorMessage = result.message || 'Domain verification failed';
      }
    } catch (error) {
      verified = false;
      errorMessage = error instanceof Error ? error.message : 'Verification failed';
    }

    if (verified) {
      // Update domain status
      await dbPool.query(
        `UPDATE publisher_domains 
         SET domain_verified = TRUE, 
             status = 'approved', 
             updated_at = NOW(),
             next_verification_at = NULL,
             verification_error = NULL,
             last_verification_attempt = NOW()
         WHERE id = $1`,
        [domainId]
      );

      // Update publisher status to 'approved' if at least one domain is verified
      const verifiedDomains = await dbPool.query(
        'SELECT COUNT(*) as count FROM publisher_domains WHERE publisher_id = $1 AND domain_verified = TRUE',
        [id]
      );

      if (parseInt(verifiedDomains.rows[0].count) > 0) {
        await dbPool.query(
          `UPDATE publishers SET status = 'approved', updated_at = NOW() WHERE id = $1`,
          [id]
        );
      }

      res.json({
        success: true,
        message: `Domain verified successfully`,
        verified: true,
        method: verificationMethod,
        is_scheduled: false,
        attempts: 0,
      });
    } else {
      // Verification failed - schedule background checks
      const { scheduleVerification } = await import('../services/background-verification.service.js');
      
      // Get current attempts
      const domainData = await dbPool.query(
        'SELECT verification_attempts FROM publisher_domains WHERE id = $1',
        [domainId]
      );
      
      const currentAttempts = domainData.rows[0]?.verification_attempts || 0;
      const nextAttempts = currentAttempts + 1;
      
      // Update error and attempt count
      await dbPool.query(
        `UPDATE publisher_domains 
         SET verification_error = $1,
             last_verification_attempt = NOW()
         WHERE id = $2`,
        [errorMessage, domainId]
      );
      
      // Schedule next attempt
      await scheduleVerification(domainId, nextAttempts);
      
      // Get next scheduled time
      const scheduleData = await dbPool.query(
        'SELECT next_verification_at FROM publisher_domains WHERE id = $1',
        [domainId]
      );
      
      const nextCheckAt = scheduleData.rows[0]?.next_verification_at;
      
      res.json({
        success: false,
        message: `${errorMessage}. We'll keep checking automatically in the background.`,
        verified: false,
        method: verificationMethod,
        is_scheduled: nextCheckAt !== null,
        next_check_at: nextCheckAt,
        attempts: nextAttempts,
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
 * POST /api/v1/publishers/:id/domains/:domainId/verify-now
 * Force immediate verification check (manual retry)
 */
router.post('/:id/domains/:domainId/verify-now', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { id, domainId } = req.params;

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

    // Get domain
    const domain = await dbPool.query(
      'SELECT id, website_url, last_verification_attempt FROM publisher_domains WHERE id = $1 AND publisher_id = $2',
      [domainId, id]
    );

    if (domain.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Rate limiting: 1 check per minute
    const lastAttempt = domain.rows[0].last_verification_attempt;
    if (lastAttempt) {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      if (new Date(lastAttempt) > oneMinuteAgo) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Please wait at least 1 minute between manual verification attempts',
          next_available_at: new Date(new Date(lastAttempt).getTime() + 60 * 1000),
        });
      }
    }

    // Attempt verification using the background service
    const { attemptVerification } = await import('../services/background-verification.service.js');
    const verified = await attemptVerification(domainId);

    // Get updated domain info
    const updatedDomain = await dbPool.query(
      `SELECT verification_attempts, next_verification_at, verification_error 
       FROM publisher_domains WHERE id = $1`,
      [domainId]
    );

    const domainData = updatedDomain.rows[0];

    res.json({
      success: verified,
      verified,
      message: verified 
        ? 'Domain verified successfully'
        : `Verification failed. ${domainData.verification_error || 'Please check your setup and try again.'}`,
      is_scheduled: !verified && domainData.next_verification_at !== null,
      next_check_at: domainData.next_verification_at,
      attempts: domainData.verification_attempts,
    });
  } catch (error) {
    console.error('Manual verification error:', error);
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

