/**
 * Prometheus Metrics Middleware
 * Collects performance metrics for monitoring
 */

import promClient from 'prom-client';

const register = new promClient.Registry();

// Collect default metrics (memory, CPU, etc.)
promClient.collectDefaultMetrics({ register });

// HTTP request duration histogram
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000], // milliseconds
  registers: [register],
});

// Ad serve counter
export const adServeCounter = new promClient.Counter({
  name: 'ad_serve_total',
  help: 'Total number of ad requests served',
  labelNames: ['publisher_id', 'status', 'format'],
  registers: [register],
});

// Campaign matching duration
export const campaignMatchDuration = new promClient.Histogram({
  name: 'campaign_match_duration_ms',
  help: 'Duration of campaign matching in ms',
  labelNames: ['publisher_id'],
  buckets: [5, 10, 25, 50, 100, 250],
  registers: [register],
});

// Ad request errors
export const adRequestErrors = new promClient.Counter({
  name: 'ad_request_errors_total',
  help: 'Total number of ad request errors',
  labelNames: ['error_type', 'publisher_id'],
  registers: [register],
});

// Matching engine metrics
export const matchingCacheHitRate = new promClient.Gauge({
  name: 'matching_cache_hit_rate',
  help: 'Campaign cache hit rate (percentage)',
  registers: [register],
});

export const matchingFilteredCampaigns = new promClient.Histogram({
  name: 'matching_filtered_campaigns',
  help: 'Number of campaigns after each filter stage',
  labelNames: ['stage', 'publisher_id'],
  buckets: [0, 1, 5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

export const matchingDuration = new promClient.Histogram({
  name: 'matching_duration_ms',
  help: 'Total campaign matching duration in milliseconds',
  labelNames: ['publisher_id'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

// Middleware to track request duration
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
}

// Metrics endpoint for Prometheus scraping
export async function metricsEndpoint(req: any, res: any) {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
}

export { register };

