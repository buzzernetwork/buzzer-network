# Verify Contract Deployment

## Step 1: Check Backend Health

After Railway deployment completes (1-2 minutes), verify the backend is running:

```bash
curl https://buzzer-networkbackend-production.up.railway.app/health
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

## Step 2: Test Contract Integration

### Option A: Via Frontend (Recommended)

1. **Go to Frontend:** https://your-frontend-url.vercel.app
2. **Create a Campaign:**
   - Navigate to Advertiser Dashboard
   - Create a new campaign
3. **Fund the Campaign:**
   - Click "Fund Campaign"
   - Connect your wallet (MetaMask/Coinbase Wallet)
   - Switch to BASE Sepolia network
   - Approve the transaction
   - Transaction should deposit to PaymentEscrow contract

### Option B: Via API (Direct Test)

Test the contract service directly:

```bash
# Get campaign balance (replace CAMPAIGN_ID)
curl -X GET \
  https://buzzer-networkbackend-production.up.railway.app/api/v1/campaigns/1/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Step 3: Verify On-Chain

### Check Contract Addresses on BaseScan

**PaymentEscrow:**
- https://sepolia-explorer.base.org/address/0x0388968D25aD2196d8C48aC28fEaaAbbeF5d9d10

**PublisherPayout:**
- https://sepolia-explorer.base.org/address/0x873023A08F57B4f3043Ad96e94cf6e106D7276A3

### Check Recent Transactions

After funding a campaign, you should see:
- A `deposit` transaction to PaymentEscrow
- Contract balance increases

---

## Step 4: Test Publisher Payout

The settlement service will automatically use the PublisherPayout contract:

1. **Wait for settlement job** (runs daily)
2. **Or trigger manually:**
   ```bash
   # On Railway, run settlement script
   railway run npm run settlement
   ```

This will:
- Calculate publisher earnings
- Execute batch payouts via PublisherPayout contract
- Create on-chain transactions

---

## Troubleshooting

### Backend fails to start

**Check Railway logs:**
```bash
railway logs
```

**Common issues:**
- Missing environment variables → Check Railway Variables tab
- Invalid private key → Ensure it starts with `0x`
- RPC connection error → Verify `BASE_SEPOLIA_RPC_URL` is correct

### Contract calls fail

**Check:**
1. Backend has `PRIVATE_KEY` set
2. Wallet has BASE Sepolia ETH (for gas)
3. Contract addresses are correct
4. Network is BASE Sepolia (not mainnet)

### Transaction fails

**Possible causes:**
- Insufficient gas (wallet needs ETH)
- Wrong network (must be BASE Sepolia)
- Contract not deployed (verify addresses)

---

## Success Indicators

✅ Backend health check returns `"status": "ok"`  
✅ Campaign funding creates on-chain transaction  
✅ PaymentEscrow contract shows balance  
✅ Publisher payouts execute on-chain  
✅ No errors in Railway logs  

---

## Next Steps

Once verified:
1. ✅ Contracts are live and functional
2. ✅ Backend can interact with contracts
3. ✅ Frontend can fund campaigns
4. ✅ Settlement service can pay publishers

**Ready for testing!** 🚀



