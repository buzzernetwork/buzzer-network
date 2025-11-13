# Setup Instructions: Metrics Routes

## Quick Setup

### Step 1: Find your main application file

File: `packages/backend/src/index.ts` (or `app.ts`/`server.ts`)

### Step 2: Import the metrics routes

Add this import near the top with other route imports:

```typescript
import metricsRoutes from './routes/metrics.routes.js';
```

### Step 3: Register the routes

Add this line where other routes are registered (look for `app.use('/api/v1/...')`):

```typescript
app.use('/api/v1/metrics', metricsRoutes);
```

### Step 4: Run migrations

```bash
cd packages/backend
npm run migrate:up
```

This will create:
- `ad_requests` table (for fill rate tracking)
- Add `require_viewability` and `viewability_premium` columns to `campaigns`
- Add `viewable` and `billed` columns to `impressions`

### Step 5: Restart your backend

```bash
npm run dev  # Development
# or
npm run build && npm start  # Production
```

## Verify Installation

### Test Fill Rate Endpoint:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3001/api/v1/metrics/fill-rate/publisher/YOUR_PUBLISHER_ID?days=7"
```

Expected response:
```json
{
  "publisher_id": "...",
  "period_days": 7,
  "overall_fill_rate": 0.95,
  "total_requests": 1000,
  "filled_requests": 950,
  "by_format": {
    "banner": { "fill_rate": 0.96, "requests": 800 },
    "native": { "fill_rate": 0.92, "requests": 200 }
  },
  "top_unfilled_reasons": [...]
}
```

### Test Viewability Endpoint:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3001/api/v1/metrics/viewability/publisher/YOUR_PUBLISHER_ID?days=30"
```

Expected response:
```json
{
  "publisher_id": "...",
  "period_days": 30,
  "total_impressions": 50000,
  "viewable_impressions": 40000,
  "viewability_rate": 0.8,
  "viewability_percentage": "80.00%",
  "quality_tier": "premium"
}
```

## Available Endpoints

### Fill Rate Metrics:
- `GET /api/v1/metrics/fill-rate/publisher/:publisherId` - Publisher fill rate stats
- `GET /api/v1/metrics/fill-rate/slot/:slotId` - Slot-specific fill rate

### Slot Performance:
- `GET /api/v1/metrics/slot/:slotId/summary` - 30-day summary
- `GET /api/v1/metrics/slot/:slotId/daily` - Daily time series

### Viewability Metrics:
- `GET /api/v1/metrics/viewability/campaign/:campaignId` - Campaign viewability
- `GET /api/v1/metrics/viewability/publisher/:publisherId` - Publisher viewability

## Notes

- All endpoints require authentication (JWT token)
- Ownership is verified (can only access your own data)
- Fill rate tracking starts from deployment (no historical data)
- Viewability data depends on frontend SDK integration

## Troubleshooting

**Migrations fail:**
- Check database connection
- Ensure no existing tables conflict
- Run migrations one at a time

**Endpoints return 404:**
- Verify routes are registered in main app file
- Check server restart completed
- Verify correct API_URL/port

**Empty metrics:**
- Fill rate: Wait 24h for data collection
- Viewability: Ensure frontend SDK is tracking viewability

## Full Documentation

See `/docs/06_implementation/INDUSTRY_STANDARDS_IMPLEMENTATION_SUMMARY.md` for complete implementation details.

