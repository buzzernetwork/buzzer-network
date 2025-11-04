/**
 * Scraper Routes
 * API endpoints for scraping memes from adprofessor.com
 */

import { Router } from 'express';
import { AdProfessorScraper } from '../services/scraper.service.js';

const router = Router();
const scraper = new AdProfessorScraper();

/**
 * GET /api/v1/scraper/memes
 * Scrape memes from adprofessor.com
 * Query params:
 *   - download: boolean (default: false) - whether to download images
 *   - limit: number (optional) - limit number of memes to return
 */
router.get('/memes', async (req, res) => {
  try {
    const shouldDownload = req.query.download === 'true' || req.query.download === '1';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    if (shouldDownload) {
      // Full scrape with downloads
      const result = await scraper.scrapeAndDownload();
      
      let memes = result.memes;
      if (limit) {
        memes = memes.slice(0, limit);
      }

      res.json({
        success: true,
        count: memes.length,
        downloaded: result.downloadedFiles.length,
        metadataPath: result.metadataPath,
        memes: memes.map(meme => ({
          ...meme,
          localPath: result.downloadedFiles.find(f => f.includes(meme.id))
        }))
      });
    } else {
      // Just scrape metadata
      const memes = await scraper.scrapeMemes();
      
      const limitedMemes = limit ? memes.slice(0, limit) : memes;

      res.json({
        success: true,
        count: limitedMemes.length,
        memes: limitedMemes
      });
    }
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to scrape memes'
    });
  }
});

/**
 * POST /api/v1/scraper/memes/download
 * Download specific meme images
 * Body: { memeIds: string[] } or { imageUrls: string[] }
 */
router.post('/memes/download', async (req, res) => {
  try {
    const { memeIds, imageUrls } = req.body;

    if (!memeIds && !imageUrls) {
      return res.status(400).json({
        success: false,
        error: 'Either memeIds or imageUrls must be provided'
      });
    }

    // First scrape to get all memes
    const allMemes = await scraper.scrapeMemes();
    
    // Filter memes based on IDs or URLs
    let memesToDownload = allMemes;
    if (memeIds && Array.isArray(memeIds)) {
      memesToDownload = allMemes.filter(m => memeIds.includes(m.id));
    } else if (imageUrls && Array.isArray(imageUrls)) {
      memesToDownload = allMemes.filter(m => imageUrls.includes(m.imageUrl));
    }

    if (memesToDownload.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No memes found matching the criteria'
      });
    }

    const downloadedFiles = await scraper.downloadAllMemes(memesToDownload);

    res.json({
      success: true,
      downloaded: downloadedFiles.length,
      files: downloadedFiles
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to download memes'
    });
  }
});

/**
 * GET /api/v1/scraper/status
 * Get scraping status and stats
 */
router.get('/status', async (req, res) => {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outputDir = path.join(__dirname, '../../scraped-memes');

    const exists = await fs.pathExists(outputDir);
    if (!exists) {
      return res.json({
        success: true,
        outputDir,
        files: 0,
        totalSize: 0
      });
    }

    const files = await fs.readdir(outputDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    // Calculate total size
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    res.json({
      success: true,
      outputDir,
      images: imageFiles.length,
      metadataFiles: jsonFiles.length,
      totalFiles: files.length,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;

