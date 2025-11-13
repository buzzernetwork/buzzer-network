# 🚀 Deploy Contracts Now - Step by Step

## Prerequisites Checklist

Before deploying, you need:

1. ✅ **Wallet with BASE Sepolia ETH** (for gas fees)
   - Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Or: https://app.chainlink.com/faucets
   - Need at least 0.01 ETH for deployment

2. ✅ **Private Key** of the deployer wallet
   - Must start with `0x`
   - Keep it secure!

3. ✅ **Contracts compiled** (we'll do this)

---

## Step 1: Create .env File

Create `packages/contracts/.env` with:

```bash
# Private key of deployer wallet (must have BASE Sepolia ETH)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# BASE Network RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Optional: For contract verification on BaseScan
BASESCAN_API_KEY=your-api-key-here
```

**⚠️ Security**: Never commit this file to git!

---

## Step 2: Install Dependencies (if needed)

```bash
cd packages/contracts
npm install
```

---

## Step 3: Compile Contracts

```bash
npm run compile
```

This compiles the contracts and checks for errors.

---

## Step 4: Deploy to BASE Sepolia

```bash
npm run deploy:base-sepolia
```

**Expected Output:**
```
🚀 Deploying Buzzer Network contracts to BASE...

📝 Deploying contracts with account: 0x...
💰 Account balance: 0.1 ETH

📦 Deploying PaymentEscrow...
✅ PaymentEscrow deployed to: 0x...

📦 Deploying PublisherPayout...
✅ PublisherPayout deployed to: 0x...

📋 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PaymentEscrow: 0x...
PublisherPayout: 0x...
Authorized Backend: 0x...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**⚠️ Save these addresses!** You'll need them for Railway.

---

## Step 5: Update Railway Environment Variables

After deployment, add these to Railway:

### Via Railway Dashboard:
1. Go to Railway Dashboard → Your Backend Service
2. **Variables** tab
3. Add these variables:

```
PAYMENT_ESCROW_ADDRESS = 0x... (from deployment)
PUBLISHER_PAYOUT_ADDRESS = 0x... (from deployment)
AUTHORIZED_BACKEND_ADDRESS = 0x... (deployer address)
PRIVATE_KEY = 0x... (same as deployer wallet)
```

### Via CLI:
```bash
cd packages/backend
railway variables set PAYMENT_ESCROW_ADDRESS=0x...
railway variables set PUBLISHER_PAYOUT_ADDRESS=0x...
railway variables set AUTHORIZED_BACKEND_ADDRESS=0x...
railway variables set PRIVATE_KEY=0x...
```

**⚠️ Security Note**: 
- `PRIVATE_KEY` should be the backend's wallet (can be same as deployer for now)
- This wallet will be authorized to spend campaign funds and execute payouts
- Keep this secure!

---

## Step 6: Verify Deployment

After Railway redeploys (1-2 minutes):

```bash
curl https://buzzer-networkbackend-production.up.railway.app/health
```

Should still show `"database": "connected"` ✅

---

## Step 7: Test Contract Integration

Once deployed, you can test:

1. **Campaign Funding** (via frontend)
   - Create a campaign
   - Fund it with ETH
   - Check balance

2. **Publisher Payouts** (via backend)
   - Settlement service will use contracts
   - Payouts will execute on-chain

---

## What Gets Deployed

### 1. PaymentEscrow Contract
- **Purpose**: Holds advertiser campaign budgets
- **Functions**:
  - `deposit()` - Advertisers fund campaigns
  - `withdraw()` - Withdraw unused funds
  - `spend()` - Backend spends on impressions/clicks
  - `getBalance()` - Check campaign balance

### 2. PublisherPayout Contract
- **Purpose**: Executes publisher earnings payouts
- **Functions**:
  - `payout()` - Pay single publisher
  - `batchPayout()` - Pay multiple publishers (gas efficient)
  - `getTotalPaid()` - Check total paid to publisher

---

## Network Information

### BASE Sepolia (Testnet)
- **Chain ID**: 84532
- **RPC URL**: https://sepolia.base.org
- **Explorer**: https://sepolia-explorer.base.org
- **Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### BASE Mainnet (Production)
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org
- **Note**: Requires real ETH

---

## Troubleshooting

### "Insufficient funds"
- Get BASE Sepolia ETH from faucet
- Check balance on explorer

### "Network not found"
- Check `.env` has correct RPC URLs
- Verify network in hardhat.config.ts

### "Invalid private key"
- Must start with `0x`
- No extra spaces/newlines
- Full 66 characters (0x + 64 hex chars)

### "Contract deployment failed"
- Check RPC URL is accessible
- Verify wallet has enough ETH
- Check network is correct (BASE Sepolia)

---

## After Deployment

✅ Contracts deployed to BASE Sepolia  
✅ Addresses saved  
✅ Railway updated  
✅ Backend can interact with contracts  
✅ Campaign funding enabled  
✅ Publisher payouts enabled  

**Next**: Test the full payment flow!


