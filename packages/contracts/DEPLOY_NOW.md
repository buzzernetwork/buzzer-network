# Deploy Contracts Now

## Quick Setup

### Step 1: Create .env file

Create `packages/contracts/.env` with your deployer wallet private key:

```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

**Important:**
- Private key must start with `0x`
- Wallet must have ETH on BASE Sepolia for gas fees
- Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### Step 2: Deploy

```bash
cd packages/contracts
npm run deploy:base-sepolia
```

### Step 3: Save the addresses

After deployment, you'll see:
```
✅ PaymentEscrow deployed to: 0x...
✅ PublisherPayout deployed to: 0x...
Authorized Backend: 0x...
```

Copy these addresses!

### Step 4: Update Railway Backend

```bash
cd packages/backend
railway variables set PAYMENT_ESCROW_ADDRESS=0x...
railway variables set PUBLISHER_PAYOUT_ADDRESS=0x...
railway variables set AUTHORIZED_BACKEND_ADDRESS=0x...
```

---

## Ready to Deploy?

1. Create `.env` file with your private key
2. Make sure wallet has BASE Sepolia ETH
3. Run: `npm run deploy:base-sepolia`
4. Copy the addresses
5. Update Railway backend

