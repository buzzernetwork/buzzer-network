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
import { testDatabaseConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbStatus = await testDatabaseConnection();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'buzzer-network-backend',
    version: '0.1.0',
    database: dbStatus ? 'connected' : 'disconnected'
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
      tracking: '/track',
    }
  });
});

// Routes
app.use('/', x402Routes);
app.use('/track', trackingRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/publishers', publisherRoutes);
app.use('/api/v1/advertisers', advertiserRoutes);
app.use('/api/v1/campaigns', campaignRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Buzzer Network Backend running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API: http://localhost:${PORT}/api/v1`);
  console.log(`📢 X402 Ad: http://localhost:${PORT}/x402/ad`);
});

