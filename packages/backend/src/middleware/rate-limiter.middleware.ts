/**
 * Rate Limiting Middleware
 * Prevents abuse and ensures fair usage of the ad serving system
 */

import rateLimit from 'express-rate-limit';

// Use memory store for now (Redis store has compatibility issues with ioredis)
// For production with multiple servers, consider using a compatible Redis adapter
// or implementing a custom store

// Global rate limit: 1000 requests per minute per IP
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Ad serving endpoint: 100 req/s per publisher (6000/min)
export const adServingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6000,
  keyGenerator: (req) => {
    const pubId = req.query.pub_id as string;
    // Always return a key without falling back to req.ip to avoid IPv6 validation
    return pubId || 'anonymous';
  },
  message: 'Ad request rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

// Tracking endpoint: Higher limit (10000/min per publisher)
export const trackingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  keyGenerator: (req) => {
    const publisherId = req.body?.publisher_id || req.query?.publisher_id;
    // Always return a key without falling back to req.ip to avoid IPv6 validation
    return (publisherId as string) || 'anonymous';
  },
  message: 'Tracking rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

