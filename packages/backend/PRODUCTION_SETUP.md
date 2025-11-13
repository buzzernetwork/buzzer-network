# Production Setup Guide

This guide covers the production-grade enhancements implemented for the Buzzer Network ad serving system.

## Overview

The following features have been implemented based on industry standards:
1. **Rate Limiting** - DDoS protection and fair usage enforcement
2. **Prometheus Metrics** - Production monitoring and observability
3. **Structured Logging** - Winston-based JSON logging with rotation
4. **GeoIP Detection** - Automatic geographic targeting
5. **A/B Testing** - Multi-campaign serving for revenue optimization
6. **Frequency Capping** - Privacy-preserving ad fatigue prevention
7. **Brand Safety** - Blocklist management (database migration ready)

---

## 1. Rate Limiting

### Implementation
- Global: 1000 req/min per IP
- Ad Serving: 6000 req/min per publisher (100 req/s)
- Tracking: 10,000 req/min per publisher

### Current Store: Memory (Single Server)
Rate limiting currently uses in-memory store, which works perfectly for single-server deployments.

**For Single Server**: ✅ Ready to use (current implementation)

**For Multi-Server/Distributed**: 
If you scale to multiple servers, you'll need a Redis-based store. The `rate-limit-redis` package has compatibility issues with `ioredis`, so you would need to:
1. Use `redis` npm package (v4+) instead of `ioredis`, OR
2. Implement a custom Redis store adapter, OR  
3. Use an alternative distributed rate limiting solution

### Redis Required (Other Features)
While rate limiting uses memory store, Redis is still required for:
- Campaign caching
- Fraud detection caching (Pixalate)
- Frequency capping
- GeoIP lookup caching
- Quality score caching

```bash
# Check Redis status
redis-cli ping
# Should return: PONG
```

---

## 2. Prometheus Metrics

### Metrics Endpoint
Access metrics at: `http://localhost:3001/metrics`

### Key Metrics
- `http_request_duration_ms` - Request latency histogram
- `ad_serve_total` - Ad requests counter
- `campaign_match_duration_ms` - Campaign matching performance
- `ad_request_errors_total` - Error counter

### Prometheus Configuration
Add to your `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'buzzer-network'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Performance Targets
- P50 latency: < 50ms
- P95 latency: < 100ms
- P99 latency: < 200ms
- Uptime: > 99.9%
- Error rate: < 0.1%

---

## 3. Structured Logging

### Log Files
Logs are written to:
- `packages/backend/logs/combined.log` - All logs
- `packages/backend/logs/error.log` - Errors only

### Log Levels
Set via environment variable:
```bash
LOG_LEVEL=info  # options: error, warn, info, debug
```

### Log Rotation
- Max file size: 5MB
- Max files: 5 (rotated)

### Component Loggers
- `adLogger` - Ad serving events
- `fraudLogger` - Fraud detection
- `paymentLogger` - X402 payments
- `matchingLogger` - Campaign matching
- `trackingLogger` - Impression/click tracking

---

## 4. GeoIP Detection

### Setup Required
Download MaxMind GeoLite2-City database:

1. **Create Account** (Free):
   - Go to: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
   - Sign up for a free account

2. **Download Database**:
   - Log in to your MaxMind account
   - Go to "Download Files"
   - Download "GeoLite2 City" (MMDB format)
   - File: `GeoLite2-City.mmdb`

3. **Install Database**:
   ```bash
   cd packages/backend
   mkdir -p data
   # Move downloaded file to:
   mv ~/Downloads/GeoLite2-City.mmdb ./data/
   ```

4. **Verify Setup**:
   - Start backend server
   - Look for log: `✅ GeoIP database loaded successfully`
   - If database missing: `⚠️  GeoIP database not found. Geographic targeting will use client-provided data only.`

### Features
- **Auto-detection**: If `geo` parameter not provided in ad request, IP is looked up
- **Caching**: GeoIP lookups cached for 24 hours in Redis
- **Privacy**: Only country code extracted by default
- **Fallback**: System works without GeoIP (uses client-provided data)

### Performance Impact
- First lookup: ~5-10ms
- Cached lookup: < 1ms
- No impact if geo parameter provided

---

## 5. A/B Testing & Multi-Demand

### How It Works
- X402 endpoint now returns **array of up to 3 ads**
- Ranked by bid amount (highest first)
- Client selects via weighted random selection

### Response Format
```json
{
  "ads": [
    {
      "ad_id": "AD_ABC12345",
      "campaign_id": "uuid",
      "creative_url": "...",
      "bid_amount": 0.002,
      "impression_url": "...",
      "click_url": "..."
    },
    // ... up to 2 more ads
  ],
  "selection_strategy": "weighted",
  "recommended_ad": { /* highest bidder */ }
}
```

### Revenue Impact
- Expected +10-15% eCPM improvement
- Advertisers compete in real-time
- Publishers get best price

---

## 6. Frequency Capping

### Configuration
- Default: 3 impressions per user per day per campaign
- Privacy-preserving: Uses SHA256(IP + User-Agent)
- Automatic: Applied to all ad requests

### How It Works
1. User fingerprint generated (hashed)
2. Counter incremented on impression
3. Counter expires after 24 hours
4. Campaigns at limit are filtered out

### Redis Keys
- Format: `freq:{campaign_id}:{fingerprint_hash}`
- TTL: 86400 seconds (24 hours)

### Benefits
- Reduces ad fatigue
- Improves campaign performance
- Better user experience
- Compliant with privacy regulations (no PII stored)

---

## 7. Brand Safety & Blocklists

### Database Migration
Run migration to create blocklist tables:
```bash
npm run migrate
```

### Tables Created
- `advertiser_blocklists` - Advertisers block publishers/domains/categories
- `publisher_blocklists` - Publishers block advertisers/brands/categories

### API Endpoints (Coming Soon)
- `POST /api/v1/advertisers/:id/blocklists`
- `POST /api/v1/publishers/:id/blocklists`
- `GET /api/v1/advertisers/:id/blocklists`
- `GET /api/v1/publishers/:id/blocklists`
- `DELETE /api/v1/blocklists/:id`

---

## Health Check Enhancements

### Endpoint
`GET /health`

### Response
```json
{
  "status": "ok",  // or "degraded"
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "buzzer-network-backend",
  "version": "0.1.0",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "campaignCachePopulated": true
  },
  "memory": {
    "heapUsed": "50 MB",
    "heapTotal": "100 MB",
    "rss": "150 MB"
  }
}
```

---

## Monitoring Dashboard Setup

### Grafana Setup
1. Install Grafana
2. Add Prometheus data source
3. Import dashboard template (coming soon)

### Key Dashboards
- Ad Serving Performance
- Campaign Matching Efficiency
- Fraud Detection Stats
- System Health Overview
- Revenue Metrics

---

## Environment Variables

Add to `.env`:
```bash
# Logging
LOG_LEVEL=info

# Monitoring
PROMETHEUS_ENABLED=true

# GeoIP (optional)
GEOIP_DATABASE_PATH=./data/GeoLite2-City.mmdb

# Rate Limiting (uses existing Redis config)
# No additional config needed
```

---

## Production Checklist

- [ ] Redis running and accessible
- [ ] GeoIP database downloaded and placed in `data/` directory
- [ ] Prometheus configured to scrape `/metrics`
- [ ] Grafana dashboards imported
- [ ] Log rotation configured (logrotate)
- [ ] Monitoring alerts configured
- [ ] Health check endpoint monitored
- [ ] Rate limits tested and adjusted per load
- [ ] Frequency cap limits reviewed

---

## Performance Testing

### Load Testing
Use Apache Bench or k6:
```bash
# Test ad serving endpoint
ab -n 10000 -c 100 'http://localhost:3001/x402/ad?pub_id=test&slot_id=test&format=banner'

# Expected results:
# - P95 latency < 100ms
# - No 429 rate limit errors (under normal load)
# - No 500 errors
```

---

## Rollback Plan

If issues occur:
1. Check logs: `tail -f packages/backend/logs/error.log`
2. Check health: `curl http://localhost:3001/health`
3. Check metrics: `curl http://localhost:3001/metrics`
4. Rollback: `git revert <commit-hash>`

---

## Support

For issues or questions:
- Check logs first
- Review metrics
- Verify Redis connectivity
- Ensure GeoIP database present (non-critical)

