# Backend Deployment Guide - Step by Step

## Quick Overview

Your backend needs:
- **PostgreSQL** database
- **Redis** for caching
- **Node.js** runtime
- **Environment variables**

---

## Option 1: Railway (Recommended - Easiest)

### Step 1: Sign Up & Install CLI

1. Go to [railway.app](https://railway.app) and sign up (use GitHub)

2. Install Railway CLI:
```bash
npm i -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```
This will open your browser to authorize.

### Step 3: Create New Project

```bash
cd packages/backend
railway init
```

When prompted:
- Create new project? → Yes
- Project name → `buzzer-network-backend` (or your choice)

### Step 4: Add PostgreSQL Database

**Via Dashboard:**
1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click your project
3. Click "New" → "Database" → "PostgreSQL"
4. Railway will automatically create and link it
5. Click on the PostgreSQL service
6. Copy the `DATABASE_URL` from the "Connect" tab

**Via CLI:**
```bash
railway add postgresql
railway variables  # Shows DATABASE_URL automatically added
```

### Step 5: Add Redis

**Via Dashboard:**
1. In your project, click "New" → "Database" → "Redis"
2. Railway will automatically create and link it
3. Copy the `REDIS_URL` from the Redis service

**Via CLI:**
```bash
railway add redis
railway variables  # Shows REDIS_URL automatically added
```

### Step 6: Set Environment Variables

**Via Dashboard:**
1. Click on your backend service (not database)
2. Go to "Variables" tab
3. Add these variables:

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```
- Click "New Variable"
- Name: `JWT_SECRET`
- Value: Generate a random string (use: `openssl rand -base64 32`)

```
PORT=3001
```
- Railway usually sets this automatically, but add if needed

```
NODE_ENV=production
```

```
BASE_NETWORK=base-sepolia
```

```
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

```
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

**Optional (for smart contracts):**
```
PAYMENT_ESCROW_ADDRESS=0x...
PUBLISHER_PAYOUT_ADDRESS=0x...
AUTHORIZED_BACKEND_ADDRESS=0x...
PRIVATE_KEY=0x...
```

**Via CLI:**
```bash
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set NODE_ENV=production
railway variables set BASE_NETWORK=base-sepolia
railway variables set BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
railway variables set BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

### Step 7: Connect GitHub Repository

**Via Dashboard:**
1. Click on your backend service
2. Go to "Settings" → "Source"
3. Click "Connect GitHub Repo"
4. Select: `buzzernetwork/buzzer-network`
5. Set "Root Directory" to: `packages/backend`
6. Set "Branch" to: `main`

Railway will now auto-deploy on every push to main.

### Step 8: Configure Build Settings

**Via Dashboard:**
1. Click on your backend service
2. Go to "Settings" → "Service"
3. Verify:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `packages/backend`

### Step 9: Deploy

**Option A: Automatic (via GitHub)**
- Just push to GitHub:
```bash
git add .
git commit -m "Deploy backend"
git push origin main
```
- Railway will automatically deploy

**Option B: Manual Deploy**
```bash
cd packages/backend
railway up
```

### Step 10: Run Database Migrations

After deployment, run migrations:

```bash
railway run npm run migrate
```

Or via dashboard:
1. Click on your backend service
2. Go to "Deployments"
3. Click on the latest deployment
4. Click "Open Shell"
5. Run: `npm run migrate`

### Step 11: Verify Deployment

1. Get your backend URL from Railway dashboard
2. Test health endpoint:
```bash
curl https://your-backend.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  ...
}
```

---

## Option 2: Render (Alternative)

### Step 1: Sign Up
Go to [render.com](https://render.com) and sign up with GitHub

### Step 2: Create PostgreSQL Database
1. Dashboard → "New +" → "PostgreSQL"
2. Name: `buzzer-network-db`
3. Region: Choose closest
4. Click "Create Database"
5. Copy "Internal Database URL" (you'll use this as `DATABASE_URL`)

### Step 3: Create Redis Instance
1. Dashboard → "New +" → "Redis"
2. Name: `buzzer-network-redis`
3. Region: Same as PostgreSQL
4. Click "Create Redis"
5. Copy "Internal Redis URL" (you'll use this as `REDIS_URL`)

### Step 4: Create Web Service
1. Dashboard → "New +" → "Web Service"
2. Connect your GitHub repository: `buzzernetwork/buzzer-network`
3. Configure:
   - **Name**: `buzzer-network-backend`
   - **Region**: Same as databases
   - **Branch**: `main`
   - **Root Directory**: `packages/backend`
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or paid for better performance)

### Step 5: Set Environment Variables
In your Web Service → Environment:
```
DATABASE_URL=postgresql://... (from PostgreSQL service)
REDIS_URL=redis://... (from Redis service)
JWT_SECRET=your-secret-key
PORT=10000  (Render uses port 10000)
NODE_ENV=production
BASE_NETWORK=base-sepolia
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

### Step 6: Deploy
- Render will automatically deploy
- Or click "Manual Deploy" → "Deploy latest commit"

### Step 7: Run Migrations
1. Go to your Web Service
2. Click "Shell" tab
3. Run: `npm run migrate`

---

## Option 3: Fly.io (Alternative)

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login
```bash
fly auth login
```

### Step 3: Create App
```bash
cd packages/backend
fly launch
```

When prompted:
- App name: `buzzer-network-backend`
- Region: Choose closest
- PostgreSQL: Yes
- Redis: Yes

### Step 4: Set Secrets
```bash
fly secrets set JWT_SECRET=$(openssl rand -base64 32)
fly secrets set NODE_ENV=production
fly secrets set BASE_NETWORK=base-sepolia
# etc...
```

### Step 5: Deploy
```bash
fly deploy
```

### Step 6: Run Migrations
```bash
fly ssh console
npm run migrate
```

---

## Environment Variables Reference

### Required Variables:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Redis
REDIS_URL=redis://host:port
# OR for Upstash (cloud Redis with TLS):
REDIS_URL=rediss://default:password@host:port

# Auth
JWT_SECRET=your-super-secret-key-min-32-chars

# Server
PORT=3001  # Or 10000 for Render
NODE_ENV=production

# Blockchain
BASE_NETWORK=base-sepolia  # or base-mainnet
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

### Optional Variables:
```bash
# Smart Contracts
PAYMENT_ESCROW_ADDRESS=0x...
PUBLISHER_PAYOUT_ADDRESS=0x...
AUTHORIZED_BACKEND_ADDRESS=0x...
PRIVATE_KEY=0x...  # For contract interactions

# X402
X402_FACILITATOR_ADDRESS=0x...

# Database SSL
DATABASE_SSL=true  # Usually needed for production
```

---

## Post-Deployment Checklist

- [ ] Backend service is running
- [ ] Health check endpoint works: `/health`
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Database migrations run successfully
- [ ] Environment variables all set
- [ ] Backend URL accessible from frontend
- [ ] CORS configured (if needed)
- [ ] API endpoints responding

---

## Troubleshooting

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Check SSL settings (production usually needs SSL)
- Ensure database is accessible from deployment platform
- For Railway: Check if services are linked

### Redis Connection Failed
- Verify `REDIS_URL` format
- Check if Redis instance is running
- For Upstash: Ensure TLS is enabled (`rediss://` not `redis://`)

### Build Fails
- Check Root Directory is `packages/backend`
- Verify `package.json` has build script
- Check Node version (should be 18+)

### Migrations Fail
- Ensure database is accessible
- Check `DATABASE_URL` is correct
- Verify migrations directory exists
- Run: `railway run npm run migrate` (or equivalent)

---

## Quick Commands Reference

### Railway:
```bash
railway login
railway init
railway add postgresql
railway add redis
railway variables set KEY=value
railway up
railway run npm run migrate
railway logs
```

### Render:
- All done via web dashboard
- Use "Shell" tab for migrations

### Fly.io:
```bash
fly launch
fly secrets set KEY=value
fly deploy
fly ssh console
fly logs
```

---

## Cost Estimate

### Railway:
- **Free tier**: $5 credit/month
- PostgreSQL: ~$5/month
- Redis: ~$5/month
- **Total**: ~$10-15/month after free tier

### Render:
- **Free tier**: Limited (90 days for PostgreSQL)
- PostgreSQL: $7/month (after free tier)
- Redis: $10/month
- Web Service: Free tier available
- **Total**: ~$17+/month

### Fly.io:
- **Free tier**: 3 shared VMs
- PostgreSQL: ~$2/month
- **Total**: ~$2-5/month (cheapest option)

---

## Recommended: Railway

**Why Railway for Backend:**
- ✅ Easiest setup (one-click databases)
- ✅ Automatic service linking
- ✅ Built-in environment variable management
- ✅ GitHub auto-deployments
- ✅ Good free tier
- ✅ Simple CLI and dashboard

---

## Next Steps After Backend Deployment

1. **Get your backend URL** (e.g., `https://buzzer-network-backend.railway.app`)

2. **Update frontend environment variable**:
   - Go to Vercel dashboard
   - Settings → Environment Variables
   - Update `NEXT_PUBLIC_API_URL` to your backend URL
   - Redeploy frontend

3. **Test integration**:
   - Frontend should connect to backend
   - Authentication should work
   - API calls should succeed

4. **Set up monitoring** (optional):
   - Railway/Render have built-in logs
   - Consider adding error tracking (Sentry, etc.)

---

## Support

If you encounter issues:
1. Check deployment logs
2. Verify environment variables
3. Test database/Redis connections
4. Check health endpoint: `/health`

## Important Notes

### Backend URL (Production)
- **Current Production URL**: `https://buzzer-networkbackend-production.up.railway.app`
- **Health Check**: `https://buzzer-networkbackend-production.up.railway.app/health`
- **Status**: Backend is live and operational

### Database Connection (Railway + Supabase)
- **Important**: Use Supabase **Connection Pooler** (Transaction mode) for Railway deployments
- **Why**: Railway may have IPv6 connectivity issues with Supabase direct connections
- **Pooler URL**: Get from Supabase Dashboard → Settings → Database → Connection pooling

