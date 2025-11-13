/**
 * Reporting Routes
 * IVT and analytics reporting endpoints for TAG compliance
 */

import { Router, Request, Response } from 'express';
import {
  generateDailyIVTSummary,
  generatePublisherIVTReport,
  generateCampaignIVTReport,
  generateTAGCompliantCSV,
  getIVTStats,
} from '../services/ivt-reporting.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { logger } from '../config/logger.js';

const router = Router();
const reportLogger = logger.child({ component: 'reports' });

/**
 * GET /api/v1/reports/ivt
 * Get IVT summary report for TAG compliance
 * 
 * Query parameters:
 * - start_date: Start date (YYYY-MM-DD)
 * - end_date: End date (YYYY-MM-DD)
 * - format: 'json' or 'csv' (default: json)
 */
router.get('/ivt', authenticate, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, format } = req.query;
    
    // Parse dates
    const startDate = start_date 
      ? new Date(start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();
    
    // Generate daily summaries for date range
    const summaries = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const summary = await generateDailyIVTSummary(new Date(currentDate));
      summaries.push(summary);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Get aggregate stats
    const stats = await getIVTStats(startDate, endDate);
    
    // Return CSV format if requested
    if (format === 'csv') {
      const csv = generateTAGCompliantCSV(summaries);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ivt-report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    }
    
    // Return JSON format
    res.status(200).json({
      success: true,
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days: summaries.length,
      },
      summary: stats,
      daily_summaries: summaries,
    });
  } catch (error) {
    reportLogger.error('IVT report generation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/reports/ivt/publishers
 * Get IVT report by publisher
 */
router.get('/ivt/publishers', authenticate, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date 
      ? new Date(start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();
    
    const report = await generatePublisherIVTReport(startDate, endDate);
    
    res.status(200).json({
      success: true,
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
      publishers: report,
    });
  } catch (error) {
    reportLogger.error('Publisher IVT report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/reports/ivt/campaigns
 * Get IVT report by campaign
 */
router.get('/ivt/campaigns', authenticate, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date 
      ? new Date(start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();
    
    const report = await generateCampaignIVTReport(startDate, endDate);
    
    res.status(200).json({
      success: true,
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
      campaigns: report,
    });
  } catch (error) {
    reportLogger.error('Campaign IVT report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/reports/ivt/stats
 * Get aggregate IVT statistics
 */
router.get('/ivt/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date 
      ? new Date(start_date as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const endDate = end_date
      ? new Date(end_date as string)
      : new Date();
    
    const stats = await getIVTStats(startDate, endDate);
    
    res.status(200).json({
      success: true,
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
      stats,
    });
  } catch (error) {
    reportLogger.error('IVT stats error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

