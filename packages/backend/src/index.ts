/**
 * Buzzer Network Backend
 * Express/Fastify server for ad network API
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import x402Routes from './routes/x402.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import publisherRoutes from './routes/publishers.routes.js';
import advertiserRoutes from './routes/advertisers.routes.js';
import authRoutes from './routes/auth.routes.js';
import campaignRoutes from './routes/campaigns.routes.js';
import adSlotsRoutes from './routes/ad-slots.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import { testDatabaseConnection } from './config/database.js';
import { startVerificationWorker } from './services/background-verification.service.js';
import { updateAllPublisherQualityScores } from './services/quality-scoring.service.js';
import { startSlotMetricsWorker } from './services/slot-metrics.service.js';
import { globalRateLimiter } from './middleware/rate-limiter.middleware.js';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.middleware.js';
import { logger } from './config/logger.js';
import { redis } from './config/redis.js';
import { initGeoIP } from './services/geo-ip.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
app.use(globalRateLimiter);

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await testDatabaseConnection();
  
  // Check Redis
  let redisStatus = 'connected';
  try {
    await redis.ping();
  } catch {
    redisStatus = 'disconnected';
  }
  
  // Check campaign cache
  const campaignCacheExists = await redis.exists('active_campaigns');
  
  // Memory usage
  const memUsage = process.memoryUsage();
  
  const overallStatus = dbStatus && redisStatus === 'connected' ? 'ok' : 'degraded';
  
  res.json({ 
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: 'buzzer-network-backend',
    version: '0.1.0',
    checks: {
      database: dbStatus ? 'connected' : 'disconnected',
      redis: redisStatus,
      campaignCachePopulated: campaignCacheExists,
    },
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Buzzer Network API',
    version: '0.1.0',
    status: 'running',
    documentation: '/api/v1',
    health: '/health',
    endpoints: {
      health: '/health',
      api_info: '/api/v1',
      x402_ad: '/x402/ad',
      publishers: '/api/v1/publishers',
      advertisers: '/api/v1/advertisers',
      campaigns: '/api/v1/campaigns',
      metrics: '/api/v1/metrics',
      tracking: '/track',
    }
  });
});

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({ 
    message: 'Buzzer Network API v1',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      x402_ad: '/x402/ad',
      publishers: '/api/v1/publishers',
      advertisers: '/api/v1/advertisers',
      campaigns: '/api/v1/campaigns',
      metrics: '/api/v1/metrics',
      tracking: '/track',
    }
  });
});

// Routes
app.use('/', x402Routes);
app.use('/track', trackingRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/publishers', publisherRoutes);
app.use('/api/v1/publishers', adSlotsRoutes); // Ad slots routes (nested under publishers)
app.use('/api/v1', adSlotsRoutes); // Ad sizes endpoint at root level
app.use('/api/v1/advertisers', advertiserRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/metrics', metricsRoutes); // Fill rate and viewability metrics

/**
 * Start quality scoring worker
 * Runs daily at 2 AM UTC to update all publisher quality scores
 */
function startQualityScoringWorker() {
  console.log('🎯 Starting quality scoring worker...');
  
  // Calculate milliseconds until next 2 AM UTC
  function getMillisecondsUntilNextRun(): number {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setUTCHours(2, 0, 0, 0);
    
    // If we've passed 2 AM today, schedule for tomorrow
    if (now >= next2AM) {
      next2AM.setUTCDate(next2AM.getUTCDate() + 1);
    }
    
    return next2AM.getTime() - now.getTime();
  }
  
  // Schedule first run
  const msUntilFirstRun = getMillisecondsUntilNextRun();
  console.log(`⏰ First quality score update scheduled in ${Math.round(msUntilFirstRun / 1000 / 60)} minutes`);
  
  setTimeout(async () => {
    // Run the update
    console.log('🎯 Running scheduled quality score update...');
    try {
      await updateAllPublisherQualityScores();
      console.log('✅ Quality score update complete');
    } catch (error) {
      console.error('❌ Quality score update failed:', error);
    }
    
    // Schedule recurring daily updates (every 24 hours)
    setInterval(async () => {
      console.log('🎯 Running scheduled quality score update...');
      try {
        await updateAllPublisherQualityScores();
        console.log('✅ Quality score update complete');
      } catch (error) {
        console.error('❌ Quality score update failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
  }, msUntilFirstRun);
}

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 Buzzer Network Backend running on port ${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/health`);
  logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
  logger.info(`🔌 API: http://localhost:${PORT}/api/v1`);
  logger.info(`📢 X402 Ad: http://localhost:${PORT}/x402/ad`);
  
  // Initialize GeoIP database
  await initGeoIP();
  
  // Start background workers
  startVerificationWorker(); // Domain verification with exponential backoff
  startQualityScoringWorker(); // Daily quality score updates at 2 AM UTC
  startSlotMetricsWorker(); // Hourly slot metrics aggregation
});

