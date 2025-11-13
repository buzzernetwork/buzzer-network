# Smart Contract Deployment Guide

## Contracts to Deploy

1. **PaymentEscrow.sol** - Holds advertiser campaign budgets
2. **PublisherPayout.sol** - Executes publisher earnings payouts

Both contracts need to be deployed to BASE network.

---

## Prerequisites

### 1. Wallet with BASE ETH
You need a wallet with ETH on BASE Sepolia (testnet) or BASE Mainnet for gas fees.

**For BASE Sepolia (Testnet):**
- Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Or: https://app.chainlink.com/faucets

**For BASE Mainnet:**
- Bridge ETH from Ethereum mainnet to BASE
- Or use a DEX to swap tokens

### 2. Private Key
You need the private key of the wallet that will deploy contracts.

⚠️ **Security**: Never commit private keys to git!

---

## Step 1: Create .env File

Create `packages/contracts/.env`:

```bash
# Private key of deployer wallet (must have ETH on BASE)
PRIVATE_KEY=0x...

# BASE Network RPC URLs
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Optional: For contract verification
BASESCAN_API_KEY=your-api-key
```

---

## Step 2: Deploy to BASE Sepolia (Testnet)

```bash
cd packages/contracts
npm run deploy:base-sepolia
```

This will:
1. Deploy PaymentEscrow contract
2. Deploy PublisherPayout contract
3. Set authorized backend address (deployer address for now)
4. Print contract addresses

**Output will look like:**
```
✅ PaymentEscrow deployed to: 0x...
✅ PublisherPayout deployed to: 0x...
Authorized Backend: 0x...
```

---

## Step 3: Update Backend Environment Variables

After deployment, add these to Railway backend:

```bash
cd packages/backend
railway variables set PAYMENT_ESCROW_ADDRESS=0x...
railway variables set PUBLISHER_PAYOUT_ADDRESS=0x...
railway variables set AUTHORIZED_BACKEND_ADDRESS=0x...
```

Or via Railway dashboard:
1. Go to your backend service
2. Variables tab
3. Add:
   - `PAYMENT_ESCROW_ADDRESS` = (from deployment output)
   - `PUBLISHER_PAYOUT_ADDRESS` = (from deployment output)
   - `AUTHORIZED_BACKEND_ADDRESS` = (deployer address)

---

## Step 4: Deploy to BASE Mainnet (Production)

Once tested on Sepolia:

```bash
cd packages/contracts
npm run deploy:base-mainnet
```

Then update Railway with mainnet addresses.

---

## Step 5: Verify Contracts (Optional)

Verify contracts on BaseScan for transparency:

```bash
npx hardhat verify --network baseSepolia CONTRACT_ADDRESS "CONSTRUCTOR_ARG1" "CONSTRUCTOR_ARG2"
```

Example:
```bash
npx hardhat verify --network baseSepolia 0x... 0x... # authorizedBackend address
```

---

## Important Notes

### Authorized Backend Address
- Currently set to deployer address
- In production, should be a separate backend wallet address
- This address can spend campaign funds and execute payouts
- Keep this private key secure!

### Security
- Never commit `.env` files
- Use separate wallets for testnet and mainnet
- Consider using a hardware wallet for mainnet
- Store private keys securely (password manager, hardware wallet)

---

## Quick Deployment Commands

### Testnet (BASE Sepolia):
```bash
cd packages/contracts
npm run deploy:base-sepolia
```

### Mainnet (BASE):
```bash
cd packages/contracts
npm run deploy:base-mainnet
```

---

## After Deployment

1. ✅ Contracts deployed
2. ✅ Addresses saved
3. ✅ Update Railway backend env vars
4. ✅ Backend can now interact with contracts
5. ✅ Campaign funding will work
6. ✅ Publisher payouts will work

---

## Troubleshooting

### "Insufficient funds"
- Make sure wallet has ETH on BASE network
- Check balance: https://basescan.org/address/YOUR_ADDRESS

### "Network not found"
- Check `.env` has correct RPC URLs
- Verify network name in hardhat.config.ts

### "Invalid private key"
- Ensure private key starts with `0x`
- Check for extra spaces or newlines

