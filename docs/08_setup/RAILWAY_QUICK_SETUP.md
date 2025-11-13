# Quick Railway Backend Setup

## Step 1: Create Backend Service (Via Dashboard)

1. Go to [railway.app/dashboard](https://railway.app/**dashboard**)
2. Open project: **zealous-benevolence**
3. Click **"New"** → **"GitHub Repo"**
4. Select repository: **buzzernetwork/buzzer-network**
5. Railway will auto-detect it's a Node.js project
6. **IMPORTANT**: In the settings, set:
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm run build` (or leave auto-detected)
   - **Start Command**: `npm start` (or leave auto-detected)

This will create the backend service and start deploying.

---

## Step 2: Get Your Credentials

### Supabase DATABASE_URL:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. **Settings** → **Database**
4. Find **"Connection string"** → **"URI"**
5. Copy the full connection string
6. It looks like: `postgresql://postgres:[PASSWORD]@db.ftidsawkbxtfcmwvlgrc.supabase.co:5432/postgres`
7. Replace `[PASSWORD]` with your actual database password

### Upstash REDIS_URL:
1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your Redis database: **cute-killdeer-20351**
3. Go to **"Details"** tab
4. Copy the **"Redis URL"** (connection string)
5. Format: `redis://default:TOKEN@cute-killdeer-20351.upstash.io:6379`

### Generate JWT_SECRET:
```bash
openssl rand -base64 32
```
Or use this one: `N/bd1PG0R0WHhCLdQ0Ziaq+N2iuVkRWDqm8LzfrDT7s=`

---

## Step 3: Set Environment Variables in Railway

### Via Dashboard:
1. Click on your **backend service** in Railway
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add these one by one:

```
DATABASE_URL = postgresql://postgres:YOUR_PASSWORD@db.ftidsawkbxtfcmwvlgrc.supabase.co:5432/postgres
DATABASE_SSL = true
REDIS_URL = redis://default:YOUR_TOKEN@cute-killdeer-20351.upstash.io:6379
JWT_SECRET = N/bd1PG0R0WHhCLdQ0Ziaq+N2iuVkRWDqm8LzfrDT7s=
PORT = 3001
NODE_ENV = production
BASE_NETWORK = base-sepolia
BASE_SEPOLIA_RPC_URL = https://sepolia.base.org
BASE_MAINNET_RPC_URL = https://mainnet.base.org
```

### Via CLI (after service is created):
```bash
cd packages/backend

# Link to the service first
railway service
# Select your backend service

# Then set variables
railway variables set DATABASE_URL="postgresql://postgres:PASSWORD@db.ftidsawkbxtfcmwvlgrc.supabase.co:5432/postgres"
railway variables set DATABASE_SSL=true
railway variables set REDIS_URL="redis://default:TOKEN@cute-killdeer-20351.upstash.io:6379"
railway variables set JWT_SECRET="N/bd1PG0R0WHhCLdQ0Ziaq+N2iuVkRWDqm8LzfrDT7s="
railway variables set PORT=3001
railway variables set NODE_ENV=production
railway variables set BASE_NETWORK=base-sepolia
railway variables set BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
railway variables set BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

---

## Step 4: Deploy

Railway will automatically deploy when you:
- Push to GitHub (if connected)
- Or manually trigger via dashboard

### Manual Deploy:
```bash
cd packages/backend
railway up
```

---

## Step 5: Run Migrations

After deployment succeeds:
```bash
railway run npm run migrate
```

Or via dashboard:
1. Click on your service
2. Go to **"Deployments"**
3. Click on latest deployment
4. Click **"Open Shell"**
5. Run: `npm run migrate`

---

## Step 6: Get Backend URL

```bash
railway domain
```

Or check Railway dashboard → Your service → Settings → Domains

You'll get a URL like: `https://your-backend.railway.app`

---

## Step 7: Update Frontend

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your frontend project
3. **Settings** → **Environment Variables**
4. Update `NEXT_PUBLIC_API_URL` to your Railway backend URL
5. Redeploy frontend

---

## Verification

Test your backend:
```bash
curl https://your-backend.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

---

## Summary

1. ✅ Create service via Railway dashboard (GitHub repo)
2. ✅ Set Root Directory: `packages/backend`
3. ✅ Add environment variables (Supabase + Upstash)
4. ✅ Deploy
5. ✅ Run migrations
6. ✅ Get backend URL
7. ✅ Update frontend API URL

**Your backend will be live!** 🚀

