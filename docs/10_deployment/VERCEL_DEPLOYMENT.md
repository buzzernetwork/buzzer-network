# Manual Vercel Deployment Guide

## Step 1: Login to Vercel

### Option A: Via Web Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" or "Log In"
3. Choose "Continue with GitHub" (recommended since your code is on GitHub)

### Option B: Via CLI
```bash
cd packages/frontend
vercel login
```
Follow the prompts to authenticate with your new account.

---

## Step 2: Link to Your GitHub Repository

### Via Web Dashboard (Recommended):
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. If not connected, click "Connect Git Provider" → GitHub
5. Authorize Vercel to access your repositories
6. Select repository: `buzzernetwork/buzzer-network`
7. Click "Import"

### Via CLI:
```bash
cd packages/frontend
vercel link
```
- Enter your project name (e.g., `buzzer-network-frontend`)
- Select your account/team
- Choose to link to existing project or create new

---

## Step 3: Configure Project Settings

### In Vercel Dashboard:

1. **Root Directory**
   - Go to Project Settings → General
   - Set "Root Directory" to: `packages/frontend`
   - Click "Save"

2. **Build Settings** (Auto-detected, but verify):
   - Framework Preset: Next.js
   - Build Command: `npm run build` (or `cd packages/frontend && npm run build`)
   - Output Directory: `.next` (Next.js default)
   - Install Command: `npm install`

### Via CLI:
```bash
cd packages/frontend
vercel --prod
```
This will prompt you to configure settings.

---

## Step 4: Set Environment Variables

### Via Web Dashboard:

1. Go to your project → Settings → Environment Variables

2. Add these variables:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```
   - Environment: Production, Preview, Development
   - Value: Your backend API URL (will update after backend deployment)

   ```
   NEXT_PUBLIC_BASE_NETWORK=base-sepolia
   ```
   - Environment: Production, Preview, Development
   - Value: `base-sepolia` (for testnet) or `base-mainnet` (for production)

   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
   ```
   - Environment: Production, Preview, Development
   - Value: Get from [cloud.reown.com](https://cloud.reown.com) (optional but recommended)

### Via CLI:
```bash
cd packages/frontend
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_BASE_NETWORK
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```
Enter values when prompted.

---

## Step 5: Deploy

### Option A: Via Web Dashboard (Automatic):
- Once you push to GitHub, Vercel will automatically deploy
- Go to Deployments tab to see status

### Option B: Via CLI:
```bash
cd packages/frontend
vercel --prod
```

### Option C: Manual Deploy:
1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Update frontend"
   git push origin main
   ```
2. Vercel will automatically detect and deploy

---

## Step 6: Verify Deployment

1. Check deployment status in Vercel dashboard
2. Visit your deployment URL (e.g., `https://buzzer-network-frontend.vercel.app`)
3. Test the application:
   - Check if homepage loads
   - Test wallet connection
   - Verify API calls work (once backend is deployed)

---

## Step 7: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `buzzer.network`)
4. Follow DNS configuration instructions
5. Vercel will automatically configure SSL

---

## Troubleshooting

### Build Fails:
- Check Root Directory is set to `packages/frontend`
- Verify Build Command: `cd packages/frontend && npm run build`
- Check Environment Variables are set

### API Calls Fail:
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings on backend
- Ensure backend is deployed and accessible

### Wallet Connection Issues:
- Verify `NEXT_PUBLIC_BASE_NETWORK` is set
- Check WalletConnect Project ID if using WalletConnect

---

## Quick Reference Commands

```bash
# Login to Vercel
vercel login

# Link project
cd packages/frontend
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_BASE_NETWORK

# Deploy to production
vercel --prod

# View deployments
vercel ls

# View logs
vercel logs
```

---

## After Backend Deployment

Once your backend is deployed:

1. Update `NEXT_PUBLIC_API_URL` in Vercel:
   - Go to Settings → Environment Variables
   - Edit `NEXT_PUBLIC_API_URL`
   - Set to: `https://your-backend.railway.app` (or your backend URL)
   - Redeploy (or wait for next push)

2. Test the full integration:
   - Frontend should connect to backend
   - Authentication should work
   - All API calls should succeed

---

## Project Structure for Vercel

Vercel needs to know where your frontend code is:

```
buzzer-network/
├── packages/
│   └── frontend/          ← Root Directory setting
│       ├── src/
│       ├── package.json
│       └── next.config.js
└── ...
```

**Important**: Set Root Directory to `packages/frontend` in Vercel settings!

