# Database Connection Fix for Railway

## Problem
Railway backend is getting `ENETUNREACH` error when connecting to Supabase via IPv6.

## Solution Options

### Option 1: Use Supabase Connection Pooler (Recommended) ⭐

Supabase provides a connection pooler that works better with serverless/cloud platforms:

1. **Get Pooler Connection String:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **Database**
   - Scroll to **"Connection string"** section
   - Select **"Connection pooling"** tab
   - Choose **"Transaction"** mode (recommended)
   - Copy the connection string
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

2. **Update Railway Environment Variable:**
   - Go to Railway dashboard
   - Open your backend service
   - Go to **Variables** tab
   - Update `DATABASE_URL` with the pooler connection string
   - Example:
     ```
     DATABASE_URL=postgresql://postgres.ftidsawkbxtfcmwvlgrc:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```

3. **Redeploy:**
   - Railway will automatically redeploy with the new connection string
   - Check logs to verify connection

---

### Option 2: Use Direct Connection with IPv4

If pooler doesn't work, try forcing IPv4:

1. **Get Direct Connection String:**
   - Go to Supabase Dashboard → Settings → Database
   - Copy **"Connection string"** → **"URI"** (direct connection)
   - Format: `postgresql://postgres:[PASSWORD]@db.ftidsawkbxtfcmwvlgrc.supabase.co:5432/postgres`

2. **Update Railway:**
   - Set `DATABASE_URL` to the direct connection string
   - Ensure `DATABASE_SSL=true` is set

3. **Check Supabase Network Settings:**
   - Go to Supabase Dashboard → Settings → Database
   - Check **"Network Restrictions"**
   - Ensure Railway IPs are allowed (or allow all if testing)

---

### Option 3: Use Supabase Session Mode Pooler

If Transaction mode doesn't work:

1. Use **"Session"** mode pooler instead
2. Port: `5432` (instead of `6543`)
3. Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres`

---

## Quick Fix Steps

1. **Get Pooler URL from Supabase:**
   ```
   Supabase Dashboard → Settings → Database → Connection pooling → Transaction mode
   ```

2. **Update Railway Variable:**
   ```
   DATABASE_URL = [pooler connection string]
   ```

3. **Verify:**
   ```bash
   curl https://buzzer-networkbackend-production.up.railway.app/health
   ```
   Should show: `"database": "connected"`

---

## Why This Happens

- Supabase returns IPv6 addresses by default
- Railway's network may not have IPv6 connectivity
- Connection pooler uses different networking that works better
- Pooler also provides better connection management

---

## Current Status

- ✅ Backend code updated to handle SSL properly
- ⏳ Need to update Railway `DATABASE_URL` with pooler connection string
- ⏳ Railway will auto-redeploy after variable update

---

## Test After Fix

```bash
# Health check should show database: "connected"
curl https://buzzer-networkbackend-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  ...
}
```

