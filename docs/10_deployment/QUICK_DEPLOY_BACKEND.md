# Quick Backend Deployment - Railway

## Where to Run Commands?

**Two Options:**

### Option A: From Backend Folder (Recommended)
Run all commands from `packages/backend/`:
- Railway detects `railway.json` config
- Commands run in correct context
- Easier for migrations and scripts

### Option B: From Root Folder
Run from project root, but configure in Railway dashboard:
- Set "Root Directory" to `packages/backend` in Railway settings
- Works but requires dashboard configuration

**Recommendation: Use Option A (from backend folder)**

---

## Step 1: Login to Railway (Manual)

Run this command in your terminal:
```bash
cd packages/backend
railway login
```

This will open your browser. Complete the authentication.

## Step 2: Initialize Project

After login, run:
```bash
railway init
```

When prompted:
- Create new project? → **Yes**
- Project name → **buzzer-network-backend**

## Step 3: Add Databases

### Add PostgreSQL:
```bash
railway add postgresql
```

### Add Redis:
```bash
railway add redis
```

Railway will automatically:
- Create the databases
- Link them to your service
- Add `DATABASE_URL` and `REDIS_URL` to environment variables

## Step 4: Set Environment Variables

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Set all required variables
railway variables set JWT_SECRET=$JWT_SECRET
railway variables set NODE_ENV=production
railway variables set BASE_NETWORK=base-sepolia
railway variables set BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
railway variables set BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

## Step 5: Connect GitHub (Optional but Recommended)

**Via Dashboard:**
1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click your project → Backend service
3. Settings → Source
4. Connect GitHub Repo: `buzzernetwork/buzzer-network`
5. Set Root Directory: `packages/backend`
6. Set Branch: `main`

## Step 6: Deploy

**Option A: Manual Deploy**
```bash
railway up
```

**Option B: Automatic (if GitHub connected)**
```bash
git add .
git commit -m "Deploy backend"
git push origin main
```

## Step 7: Run Migrations

```bash
railway run npm run migrate
```

## Step 8: Get Your Backend URL

```bash
railway domain
```

Or check Railway dashboard → Your service → Settings → Domains

## Step 9: Test

```bash
# Test health endpoint
curl https://your-backend.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```

## Step 10: Update Frontend

1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. Redeploy frontend

## Important Notes

### Production Backend URL
- **Current**: `https://buzzer-networkbackend-production.up.railway.app`
- **Health Check**: `/health` endpoint available
- **Status**: Backend is live and operational

### Database Connection (Supabase + Railway)
- **Important**: Use Supabase **Connection Pooler** (Transaction mode) for Railway
- **Why**: Avoids IPv6 connectivity issues between Railway and Supabase
- **Pooler URL**: Supabase Dashboard → Settings → Database → Connection pooling → Transaction mode

---

## All Commands in One Go

```bash
cd packages/backend

# Login (opens browser)
railway login

# Initialize
railway init

# Add databases
railway add postgresql
railway add redis

# Set variables
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set NODE_ENV=production
railway variables set BASE_NETWORK=base-sepolia
railway variables set BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
railway variables set BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Deploy
railway up

# Run migrations
railway run npm run migrate

# Get URL
railway domain
```

