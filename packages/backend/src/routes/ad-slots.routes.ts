/**
 * Ad Slots Routes
 * CRUD operations for publisher ad slot management
 */

import { Router } from 'express';
import { dbPool } from '../config/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { 
  validateSlot, 
  generateSlotId, 
  sanitizeSlotPath,
  ValidationError 
} from '../services/slot-validation.service.js';
import { 
  generateIntegrationCode,
  generateIntegrationInstructions,
  generateTestPage,
  generateCurlTest
} from '../services/integration-code.service.js';
import { IAB_AD_SIZES, RECOMMENDED_MULTI_SIZE_COMBOS, getAllSizesAsStrings } from '../config/iab-ad-sizes.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createSlotSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().optional(),
  format: z.enum(['banner', 'native', 'video']),
  sizes: z.array(z.string()).min(1),
  primary_size: z.string(),
  position: z.enum(['above_fold', 'below_fold', 'sidebar', 'footer']).optional(),
  refresh_enabled: z.boolean().optional().default(false),
  refresh_interval: z.number().min(30).max(300).optional(),
  lazy_load: z.boolean().optional().default(false),
  viewability_threshold: z.number().min(0).max(1).optional(),
  floor_price: z.number().min(0).max(1000).optional(),
});

const updateSlotSchema = createSlotSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['active', 'paused', 'archived']),
});

/**
 * GET /api/v1/ad-sizes
 * Get IAB standard ad sizes and recommended combinations
 */
router.get('/ad-sizes', (req, res) => {
  res.json({
    sizes: IAB_AD_SIZES,
    all_sizes: getAllSizesAsStrings(),
    recommended_combos: RECOMMENDED_MULTI_SIZE_COMBOS,
  });
});

/**
 * POST /api/v1/publishers/:publisherId/slots
 * Create new ad slot
 */
router.post('/:publisherId/slots', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { publisherId } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify publisher ownership
    const publisherCheck = await dbPool.query(
      'SELECT id, wallet_address FROM publishers WHERE id = $1 AND wallet_address = $2',
      [publisherId, walletAddress]
    );
    
    if (publisherCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You do not own this publisher account' });
    }
    
    // Validate request body
    const validation = createSlotSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }
    
    const slotData = validation.data;
    
    // Additional validation
    const validationErrors = validateSlot(slotData as any);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }
    
    // Generate unique slot ID
    const slotId = generateSlotId(publisherId);
    
    // Sanitize path
    const sanitizedPath = sanitizeSlotPath(slotData.path);
    
    // Insert slot
    const result = await dbPool.query(
      `INSERT INTO ad_slots (
        slot_id, publisher_id, name, path, format, dimensions, sizes, primary_size,
        position, refresh_enabled, refresh_interval, lazy_load, 
        viewability_threshold, floor_price, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING *`,
      [
        slotId,
        publisherId,
        slotData.name,
        sanitizedPath,
        slotData.format,
        slotData.primary_size, // Store primary as dimensions for backward compat
        JSON.stringify(slotData.sizes),
        slotData.primary_size,
        slotData.position || 'above_fold',
        slotData.refresh_enabled || false,
        slotData.refresh_interval || 30,
        slotData.lazy_load || false,
        slotData.viewability_threshold || 0.50,
        slotData.floor_price || null,
      ]
    );
    
    const slot = result.rows[0];
    
    // Generate integration code
    const integrationCode = generateIntegrationCode({
      slot_id: slot.slot_id,
      publisher_id: slot.publisher_id,
      name: slot.name,
      primary_size: slot.primary_size,
      format: slot.format,
      refresh_enabled: slot.refresh_enabled,
      refresh_interval: slot.refresh_interval,
      lazy_load: slot.lazy_load,
    });
    
    const instructions = generateIntegrationInstructions({
      slot_id: slot.slot_id,
      publisher_id: slot.publisher_id,
      name: slot.name,
      primary_size: slot.primary_size,
      format: slot.format,
      refresh_enabled: slot.refresh_enabled,
      refresh_interval: slot.refresh_interval,
      lazy_load: slot.lazy_load,
    });
    
    res.status(201).json({
      success: true,
      slot: {
        ...slot,
        sizes: JSON.parse(slot.sizes),
      },
      integration_code: integrationCode,
      instructions,
    });
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:publisherId/slots
 * List all ad slots for publisher
 */
router.get('/:publisherId/slots', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { publisherId } = req.params;
    const { status, format, limit = '50', offset = '0' } = req.query;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify publisher ownership
    const publisherCheck = await dbPool.query(
      'SELECT id FROM publishers WHERE id = $1 AND wallet_address = $2',
      [publisherId, walletAddress]
    );
    
    if (publisherCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Build query
    let query = `
      SELECT 
        s.*,
        COALESCE(
          (SELECT SUM(impressions) FROM slot_metrics WHERE slot_id = s.slot_id AND date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as total_impressions,
        COALESCE(
          (SELECT SUM(clicks) FROM slot_metrics WHERE slot_id = s.slot_id AND date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as total_clicks,
        COALESCE(
          (SELECT SUM(revenue) FROM slot_metrics WHERE slot_id = s.slot_id AND date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as total_revenue,
        COALESCE(
          (SELECT AVG(viewability_rate) FROM slot_metrics WHERE slot_id = s.slot_id AND date >= CURRENT_DATE - INTERVAL '30 days'),
          0
        ) as avg_viewability_rate
      FROM ad_slots s
      WHERE s.publisher_id = $1
    `;
    
    const params: any[] = [publisherId];
    let paramIndex = 2;
    
    // Add filters
    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (format) {
      query += ` AND s.format = $${paramIndex}`;
      params.push(format);
      paramIndex++;
    }
    
    query += ` ORDER BY s.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));
    
    const result = await dbPool.query(query, params);
    
    // Parse JSON fields
    const slots = result.rows.map(slot => ({
      ...slot,
      sizes: slot.sizes ? JSON.parse(slot.sizes) : [],
    }));
    
    // Get total count
    const countResult = await dbPool.query(
      'SELECT COUNT(*) FROM ad_slots WHERE publisher_id = $1',
      [publisherId]
    );
    
    res.json({
      slots,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('List slots error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:publisherId/slots/:slotId
 * Get single ad slot with performance data
 */
router.get('/:publisherId/slots/:slotId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { publisherId, slotId } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify ownership and get slot
    const result = await dbPool.query(
      `SELECT s.*, p.wallet_address
       FROM ad_slots s
       JOIN publishers p ON s.publisher_id = p.id
       WHERE s.slot_id = $1 AND s.publisher_id = $2 AND p.wallet_address = $3`,
      [slotId, publisherId, walletAddress]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    const slot = result.rows[0];
    
    // Get 30-day performance metrics
    const metricsResult = await dbPool.query(
      `SELECT 
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(revenue) as total_revenue,
        AVG(ctr) as avg_ctr,
        AVG(ecpm) as avg_ecpm,
        AVG(fill_rate) as avg_fill_rate,
        AVG(viewability_rate) as avg_viewability_rate
       FROM slot_metrics
       WHERE slot_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [slotId]
    );
    
    const metrics = metricsResult.rows[0];
    
    // Get daily performance for chart
    const dailyResult = await dbPool.query(
      `SELECT date, impressions, clicks, revenue, ctr, ecpm, viewability_rate
       FROM slot_metrics
       WHERE slot_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY date ASC`,
      [slotId]
    );
    
    // Generate integration code
    const integrationCode = generateIntegrationCode({
      slot_id: slot.slot_id,
      publisher_id: slot.publisher_id,
      name: slot.name,
      primary_size: slot.primary_size,
      format: slot.format,
      refresh_enabled: slot.refresh_enabled,
      refresh_interval: slot.refresh_interval,
      lazy_load: slot.lazy_load,
    });
    
    const instructions = generateIntegrationInstructions({
      slot_id: slot.slot_id,
      publisher_id: slot.publisher_id,
      name: slot.name,
      primary_size: slot.primary_size,
      format: slot.format,
      refresh_enabled: slot.refresh_enabled,
      refresh_interval: slot.refresh_interval,
      lazy_load: slot.lazy_load,
    });
    
    res.json({
      slot: {
        ...slot,
        sizes: slot.sizes ? JSON.parse(slot.sizes) : [],
      },
      metrics: {
        ...metrics,
        daily: dailyResult.rows,
      },
      integration_code: integrationCode,
      instructions,
    });
  } catch (error) {
    console.error('Get slot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/v1/publishers/:publisherId/slots/:slotId
 * Update ad slot configuration
 */
router.put('/:publisherId/slots/:slotId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { publisherId, slotId } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify ownership
    const ownershipCheck = await dbPool.query(
      `SELECT 1 FROM ad_slots s
       JOIN publishers p ON s.publisher_id = p.id
       WHERE s.slot_id = $1 AND s.publisher_id = $2 AND p.wallet_address = $3`,
      [slotId, publisherId, walletAddress]
    );
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    // Validate request body
    const validation = updateSlotSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }
    
    const updates = validation.data;
    
    // Additional validation if provided
    if (Object.keys(updates).length > 0) {
      const validationErrors = validateSlot(updates as any);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        });
      }
    }
    
    // Build update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let valueIndex = 1;
    
    if (updates.name !== undefined) {
      updateFields.push(`name = $${valueIndex++}`);
      updateValues.push(updates.name);
    }
    
    if (updates.path !== undefined) {
      updateFields.push(`path = $${valueIndex++}`);
      updateValues.push(sanitizeSlotPath(updates.path));
    }
    
    if (updates.sizes !== undefined) {
      updateFields.push(`sizes = $${valueIndex++}`);
      updateValues.push(JSON.stringify(updates.sizes));
    }
    
    if (updates.primary_size !== undefined) {
      updateFields.push(`primary_size = $${valueIndex++}`, `dimensions = $${valueIndex++}`);
      updateValues.push(updates.primary_size, updates.primary_size);
    }
    
    if (updates.position !== undefined) {
      updateFields.push(`position = $${valueIndex++}`);
      updateValues.push(updates.position);
    }
    
    if (updates.refresh_enabled !== undefined) {
      updateFields.push(`refresh_enabled = $${valueIndex++}`);
      updateValues.push(updates.refresh_enabled);
    }
    
    if (updates.refresh_interval !== undefined) {
      updateFields.push(`refresh_interval = $${valueIndex++}`);
      updateValues.push(updates.refresh_interval);
    }
    
    if (updates.lazy_load !== undefined) {
      updateFields.push(`lazy_load = $${valueIndex++}`);
      updateValues.push(updates.lazy_load);
    }
    
    if (updates.viewability_threshold !== undefined) {
      updateFields.push(`viewability_threshold = $${valueIndex++}`);
      updateValues.push(updates.viewability_threshold);
    }
    
    if (updates.floor_price !== undefined) {
      updateFields.push(`floor_price = $${valueIndex++}`);
      updateValues.push(updates.floor_price);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(slotId);
    
    const query = `
      UPDATE ad_slots
      SET ${updateFields.join(', ')}
      WHERE slot_id = $${valueIndex}
      RETURNING *
    `;
    
    const result = await dbPool.query(query, updateValues);
    
    res.json({
      success: true,
      slot: {
        ...result.rows[0],
        sizes: result.rows[0].sizes ? JSON.parse(result.rows[0].sizes) : [],
      },
    });
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/v1/publishers/:publisherId/slots/:slotId/status
 * Update ad slot status
 */
router.patch('/:publisherId/slots/:slotId/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { publisherId, slotId } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate request body
    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }
    
    const { status } = validation.data;
    
    // Update status
    const result = await dbPool.query(
      `UPDATE ad_slots
       SET status = $1, updated_at = NOW()
       FROM publishers
       WHERE ad_slots.slot_id = $2 
         AND ad_slots.publisher_id = $3
         AND publishers.id = ad_slots.publisher_id
         AND publishers.wallet_address = $4
       RETURNING ad_slots.*`,
      [status, slotId, publisherId, walletAddress]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    res.json({
      success: true,
      slot: {
        ...result.rows[0],
        sizes: result.rows[0].sizes ? JSON.parse(result.rows[0].sizes) : [],
      },
    });
  } catch (error) {
    console.error('Update slot status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/publishers/:publisherId/slots/:slotId/test-page
 * Generate test page HTML for ad slot
 */
router.get('/:publisherId/slots/:slotId/test-page', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const walletAddress = req.walletAddress;
    const { publisherId, slotId } = req.params;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get slot
    const result = await dbPool.query(
      `SELECT s.*
       FROM ad_slots s
       JOIN publishers p ON s.publisher_id = p.id
       WHERE s.slot_id = $1 AND s.publisher_id = $2 AND p.wallet_address = $3`,
      [slotId, publisherId, walletAddress]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    const slot = result.rows[0];
    
    const testPage = generateTestPage({
      slot_id: slot.slot_id,
      publisher_id: slot.publisher_id,
      name: slot.name,
      primary_size: slot.primary_size,
      format: slot.format,
      refresh_enabled: slot.refresh_enabled,
      refresh_interval: slot.refresh_interval,
      lazy_load: slot.lazy_load,
    });
    
    res.setHeader('Content-Type', 'text/html');
    res.send(testPage);
  } catch (error) {
    console.error('Generate test page error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

