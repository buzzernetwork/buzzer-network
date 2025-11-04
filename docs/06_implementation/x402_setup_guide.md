# X402 Protocol Setup Guide

**Status**: Implementation in Progress  
**Priority**: CRITICAL - Core protocol integration

---

## Overview

X402 is an open payment protocol that enables instant, automatic stablecoin payments directly over HTTP using the HTTP 402 "Payment Required" status code. This guide covers the setup and integration of X402 for Buzzer Network.

---

## 1. Understanding X402 Protocol

### Key Concepts

1. **HTTP 402 Status Code**: The protocol revives the dormant HTTP 402 "Payment Required" status code
2. **Micropayments**: Designed for small payments (as low as $0.001)
3. **Instant Settlement**: Sub-second settlement times on BASE
4. **No Registration**: Wallet-based authentication, no accounts required
5. **Facilitator Services**: Coinbase provides hosted facilitator for BASE network

### How It Works

```
1. Client requests resource (ad)
2. Server responds with 402 Payment Required
3. Client initiates payment via wallet
4. Payment verified on-chain (BASE)
5. Resource served (ad displayed)
```

---

## 2. X402 Resources

### Official Resources
- **Coinbase X402 Docs**: https://docs.cdp.coinbase.com/x402/
- **GitHub Repository**: https://github.com/coinbase/x402
- **Whitepaper**: https://www.x402.org/x402-whitepaper.pdf
- **BASE Integration**: https://blockeden.xyz/docs/x402/introduction/

### SDKs & Libraries
- **x402-sdk**: Official SDK (check GitHub for latest)
- **x402-rs**: Rust implementation (reference)
- **x402-secure**: Enhanced security layer

### Reference Implementations
- **Ad-402**: ETHGlobal showcase (X402 ad network)
- **M2M Protocol**: X402 + BASE integration example

---

## 3. Implementation Steps

### Step 1: Study Official Repository

```bash
# Clone Coinbase X402 repo for reference
git clone https://github.com/coinbase/x402.git
cd x402
# Study the implementation
```

**Key Areas to Study:**
- HTTP 402 status code handling
- Payment verification flow
- BASE network integration
- Facilitator service usage

### Step 2: Install X402 SDK

**Note**: Check official repo for latest package name and installation

```bash
# Install X402 SDK (example - verify actual package name)
npm install @coinbase/x402-sdk

# Or if using facilitator service
npm install @coinbase/x402-facilitator
```

### Step 3: Configure BASE Network

```typescript
// Example configuration (verify with official docs)
import { X402Client } from '@coinbase/x402-sdk';

const x402Client = new X402Client({
  chain: 'base',
  network: 'base-mainnet', // or 'base-sepolia' for testnet
  facilitator: {
    // Use Coinbase hosted facilitator
    url: 'https://facilitator.coinbase.com',
    // Or self-hosted
    // url: 'https://your-facilitator.com'
  }
});
```

### Step 4: Implement X402 Middleware

```typescript
// backend/src/middleware/x402.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { X402Client } from '@coinbase/x402-sdk';

const x402Client = new X402Client({
  chain: 'base',
  network: process.env.BASE_NETWORK || 'base-sepolia',
});

export const x402Middleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if payment required
  const paymentRequired = await checkPaymentRequired(req);
  
  if (paymentRequired) {
    // Return 402 Payment Required
    return res.status(402).json({
      error: 'Payment Required',
      payment_address: paymentRequired.address,
      amount: paymentRequired.amount,
      token: 'ETH', // or USDC
      x402_payment_url: paymentRequired.paymentUrl,
    });
  }
  
  next();
};
```

### Step 5: Create X402 Ad Endpoint

```typescript
// backend/src/routes/x402.ad.ts
import { Router } from 'express';
import { x402Middleware } from '../middleware/x402.middleware';
import { matchCampaigns } from '../services/matching.service';

const router = Router();

// GET /x402/ad - X402-compliant ad serving endpoint
router.get('/x402/ad', x402Middleware, async (req, res) => {
  const { pub_id, slot_id, format, geo, device } = req.query;
  
  // Validate required parameters
  if (!pub_id || !slot_id || !format) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  // Match campaigns
  const campaigns = await matchCampaigns({
    publisherId: pub_id as string,
    slotId: slot_id as string,
    format: format as string,
    geo: geo as string,
    device: device as string,
  });
  
  if (campaigns.length === 0) {
    return res.status(404).json({ error: 'No matching campaigns' });
  }
  
  // Select best campaign (bid-based)
  const selectedCampaign = campaigns[0];
  
  // Return X402-compliant response
  res.status(200).json({
    ad_id: selectedCampaign.id,
    creative_url: selectedCampaign.creativeUrl,
    format: selectedCampaign.format,
    width: selectedCampaign.width,
    height: selectedCampaign.height,
    click_url: `${process.env.API_URL}/track/click/${selectedCampaign.id}`,
    impression_url: `${process.env.API_URL}/track/impression/${selectedCampaign.id}`,
  });
});

export default router;
```

### Step 6: Handle X402 Payment

```typescript
// backend/src/services/payment.service.ts
import { X402Client } from '@coinbase/x402-sdk';

export async function verifyX402Payment(
  paymentRequest: X402PaymentRequest
): Promise<boolean> {
  const x402Client = new X402Client({
    chain: 'base',
    network: process.env.BASE_NETWORK,
  });
  
  // Verify payment on-chain
  const verified = await x402Client.verifyPayment({
    transactionHash: paymentRequest.txHash,
    amount: paymentRequest.amount,
    token: paymentRequest.token,
  });
  
  return verified;
}
```

---

## 4. BASE Network Configuration

### Hardhat Configuration

```javascript
// contracts/hardhat.config.js
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: '0.8.20',
  networks: {
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    baseMainnet: {
      url: 'https://mainnet.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },
};
```

### Wallet Configuration (Frontend)

```typescript
// frontend/src/config/wallet.ts
import { configureChains, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { publicProvider } from 'wagmi/providers/public';

const { chains, publicClient } = configureChains(
  [baseSepolia, base], // Testnet first, then mainnet
  [publicProvider()]
);

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'Buzzer Network',
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      },
    }),
  ],
  publicClient,
});
```

---

## 5. Testing X402 Integration

### Test HTTP 402 Flow

```typescript
// backend/tests/x402.test.ts
import request from 'supertest';
import app from '../src/app';

describe('X402 Ad Endpoint', () => {
  it('should return 402 Payment Required when payment needed', async () => {
    const response = await request(app)
      .get('/x402/ad')
      .query({
        pub_id: 'test_pub',
        slot_id: 'test_slot',
        format: 'banner',
      });
    
    // Should return 402 or 200 depending on payment requirement
    expect([200, 402]).toContain(response.status);
  });
  
  it('should return ad data when payment verified', async () => {
    // Mock payment verification
    // Make request
    // Verify 200 response with ad data
  });
});
```

---

## 6. Facilitator Service Decision

### Option 1: Coinbase Hosted Facilitator (Recommended for MVP)

**Pros:**
- No infrastructure to maintain
- Fee-free USDC payments on BASE
- Maintained by Coinbase
- Easy integration

**Cons:**
- Dependency on Coinbase
- Less control

**Setup:**
```typescript
// Use Coinbase hosted facilitator
const facilitator = {
  url: 'https://facilitator.coinbase.com',
  apiKey: process.env.COINBASE_FACILITATOR_API_KEY, // if required
};
```

### Option 2: Self-Hosted Facilitator

**Pros:**
- Full control
- No dependencies
- Customizable

**Cons:**
- Requires infrastructure
- Maintenance overhead
- More complex

**Setup:**
- Deploy facilitator service
- Configure BASE network
- Handle payment verification

---

## 7. Next Steps

### Immediate Actions
- [ ] Study Coinbase X402 official repository
- [ ] Install X402 SDK (verify package name)
- [ ] Configure BASE network in Hardhat
- [ ] Set up wallet connection (wagmi)
- [ ] Create X402 middleware
- [ ] Implement X402 ad endpoint
- [ ] Test HTTP 402 flow

### Testing Checklist
- [ ] Test HTTP 402 response
- [ ] Test payment verification
- [ ] Test ad serving after payment
- [ ] Test on BASE testnet
- [ ] Test with real wallet

---

## 8. Troubleshooting

### Common Issues

**Issue**: Cannot find X402 SDK package
- **Solution**: Check official GitHub repo for latest package name
- **Alternative**: Use facilitator service directly

**Issue**: HTTP 402 not recognized by browser
- **Solution**: Handle 402 in JavaScript, use custom header
- **Note**: Some browsers may not handle 402 properly

**Issue**: Payment verification fails
- **Solution**: Check BASE network connection
- **Verify**: Transaction hash is correct
- **Check**: Facilitator service status

---

## 9. References

- [X402 Protocol Docs](https://docs.cdp.coinbase.com/x402/)
- [BASE Blockchain](https://docs.base.org/)
- [Ad-402 Reference](https://ethglobal.com/showcase/ad-402-5bnqt)
- [M2M Protocol](https://github.com/AndreaRettaroli/m2m)

---

**Last Updated**: 2025-01-27  
**Status**: Implementation in Progress

