# Redis Setup Guide

## Do You Need Redis/Upstash?

**Short Answer**: **Recommended but not required for MVP**

Redis is used for:
1. **Campaign Matching Cache** - Caches active campaigns (5 min TTL) for faster ad serving
2. **Idempotency** - Prevents duplicate impression/click tracking
3. **Performance** - Reduces database queries for frequently accessed data

**Without Redis**: The system will still work, but:
- Ad serving will be slower (every request hits database)
- Risk of duplicate tracking events
- Higher database load

---

## Options

### Option 1: Upstash (Recommended for Production) ⭐

**Pros:**
- ✅ Serverless (no infrastructure to manage)
- ✅ Free tier available (10,000 commands/day)
- ✅ Global edge locations
- ✅ Auto-scaling
- ✅ Perfect for serverless/Vercel deployments

**Setup:**

1. **Create Upstash Account**
   - Go to https://upstash.com
   - Sign up (free tier available)
   - Create new Redis database

2. **Get Connection Details**
   - Copy the REST API URL
   - Copy the REST API Token
   - Or use Redis connection string

3. **Configure Environment**
   ```bash
   # In packages/backend/.env
   
   # Option A: REST API (recommended for serverless)
   UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   
   # Option B: Redis connection string
   REDIS_URL=redis://default:your-token@your-endpoint.upstash.io:6379
   ```

4. **Update Redis Config** (if using REST API)
   The current config uses `ioredis` which works with Upstash Redis connection strings.

---

### Option 2: Local Redis (Development)

**Setup:**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis
```

**Configure:**
```bash
# In packages/backend/.env
REDIS_HOST=localhost
REDIS_PORT=6379
# No password needed for local
```

---

### Option 3: Make Redis Optional (Graceful Degradation)

You can modify the code to work without Redis:
- Cache operations fail gracefully
- System falls back to database queries
- Idempotency handled differently

**Current Status**: The code already handles Redis errors gracefully (returns null on errors), but always tries to connect.

---

## Current Redis Usage

### 1. Campaign Matching Cache
```typescript
// packages/backend/src/services/matching.service.ts
// Caches active campaigns for 5 minutes
await cache.set('active_campaigns', campaigns, 300);
```

### 2. Idempotency (Tracking)
```typescript
// packages/backend/src/routes/tracking.routes.ts
// Prevents duplicate impressions/clicks
const idempotencyKey = `impression:${adId}:${publisher_id}:${Date.now()}`;
await cache.set(idempotencyKey, true, 3600);
```

### 3. Cache Invalidation
```typescript
// When campaigns are updated
await cache.del('active_campaigns');
```

---

## Recommendation

### For MVP/Development
- **Optional**: Can work without Redis
- **Recommended**: Use local Redis or Upstash free tier

### For Production
- **Required**: Use Upstash or managed Redis
- **Why**: Performance, idempotency, scalability

---

## Quick Setup: Upstash

1. **Sign up**: https://upstash.com
2. **Create database**: Choose region closest to you
3. **Get connection string**: Copy from dashboard
4. **Add to `.env`**:
   ```bash
   REDIS_URL=redis://default:YOUR_TOKEN@YOUR_ENDPOINT.upstash.io:6379
   ```
5. **Test connection**: Start backend and check logs

---

## Testing Redis Connection

```bash
cd packages/backend
npm run dev

# Check logs for:
# ✅ Redis connected
# OR
# ❌ Redis connection error (will still work, just slower)
```

---

## Current Configuration

The Redis config is in `packages/backend/src/config/redis.ts` and supports:
- Custom host/port
- Password authentication
- Connection string (via REDIS_URL)
- Automatic retry on failure
- Graceful error handling

---

## Summary

**Do you need Upstash?**
- ✅ **For production**: Yes, recommended
- ⚠️ **For development**: Optional (can use local Redis or skip)
- ✅ **For MVP testing**: Not required, but will improve performance

**The system works without Redis**, but performance will be better with it.

### Decision Summary
- **MVP/Development**: Redis is optional - system works fine without it (just slower ad serving)
- **Production**: Redis recommended for performance, idempotency, and scalability
- **Current Implementation**: Gracefully handles Redis unavailability (falls back to database queries)

---

**Next Steps:**
1. For quick start: Skip Redis for now (works without it)
2. For production: Set up Upstash (5 minutes)
3. For development: Use local Redis (optional)




