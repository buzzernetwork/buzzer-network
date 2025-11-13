# Complete Customer Journey - All Endpoints

## ✅ Test Results

**Backend URL:** https://buzzer-networkbackend-production.up.railway.app  
**Status:** All public endpoints tested and working  
**Date:** November 7, 2025

---

## 📋 All Available Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/health` | Health check | ✅ Working |
| GET | `/` | API root information | ✅ Working |
| GET | `/api/v1` | API version and endpoints | ✅ Working |
| POST | `/api/v1/auth/message` | Get authentication message | ✅ Working |
| GET | `/x402/ad` | Request ad (X402 protocol) | ✅ Working |
| POST | `/track/impression/:adId` | Track impression event | ✅ Ready |
| GET | `/track/click/:adId` | Track click event | ✅ Ready |

### Authenticated Endpoints (Require JWT Token)

| Method | Endpoint | Description | User Type |
|--------|----------|-------------|-----------|
| POST | `/api/v1/auth/verify` | Verify signature, get JWT | Both |
| GET | `/api/v1/auth/me` | Get current user info | Both |
| POST | `/api/v1/advertisers` | Register advertiser | Advertiser |
| POST | `/api/v1/advertisers/campaigns` | Create campaign | Advertiser |
| GET | `/api/v1/advertisers/campaigns` | List campaigns | Advertiser |
| PATCH | `/api/v1/advertisers/campaigns/:id` | Update campaign | Advertiser |
| POST | `/api/v1/campaigns/fund` | Fund campaign | Advertiser |
| GET | `/api/v1/campaigns/:id` | Get campaign details | Advertiser |
| GET | `/api/v1/campaigns/:id/balance` | Get campaign balance | Advertiser |
| POST | `/api/v1/publishers` | Register publisher | Publisher |
| GET | `/api/v1/publishers/me` | Get publisher info | Publisher |
| GET | `/api/v1/publishers/:id/verification-token` | Get verification token | Publisher |
| POST | `/api/v1/publishers/:id/verify` | Verify domain | Publisher |
| GET | `/api/v1/publishers/:id/earnings` | Get earnings | Publisher |

---

## 🚀 Complete Customer Journey

### Journey 1: Advertiser Flow

#### Step 1: Authentication
```bash
# 1. Get auth message
POST /api/v1/auth/message
Body: { "address": "0x..." }

# 2. Sign message with wallet (frontend)
# 3. Verify signature
POST /api/v1/auth/verify
Body: { "address": "0x...", "message": "...", "signature": "0x..." }
Response: { "token": "jwt_token_here" }
```

#### Step 2: Register Advertiser
```bash
POST /api/v1/advertisers
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "company_name": "My Company",
  "website_url": "https://example.com"
}
```

#### Step 3: Create Campaign
```bash
POST /api/v1/advertisers/campaigns
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "name": "Summer Sale Campaign",
  "objective": "clicks",
  "bid_model": "CPC",
  "bid_amount": 0.01,
  "total_budget": 1.0,
  "daily_budget": 0.1,
  "targeting": {
    "geo": ["US", "CA"],
    "categories": ["technology"],
    "quality_min": 70,
    "devices": ["desktop", "mobile"]
  },
  "creative_url": "https://example.com/ad.jpg",
  "creative_format": "banner",
  "landing_page_url": "https://example.com/landing"
}
```

#### Step 4: Fund Campaign
```bash
# Get funding transaction data
POST /api/v1/campaigns/fund
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "campaign_id": "<campaign_id>",
  "amount": "0.1"
}

# Execute transaction with wallet (frontend)
# Transaction goes to PaymentEscrow contract
```

#### Step 5: Check Campaign Status
```bash
# Get campaign details
GET /api/v1/campaigns/:id
Headers: { "Authorization": "Bearer <token>" }

# Get on-chain balance
GET /api/v1/campaigns/:id/balance
Headers: { "Authorization": "Bearer <token>" }
```

---

### Journey 2: Publisher Flow

#### Step 1: Authentication
```bash
# Same as advertiser - get message, sign, verify
POST /api/v1/auth/message
POST /api/v1/auth/verify
```

#### Step 2: Register Publisher
```bash
POST /api/v1/publishers
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "website_url": "https://mypublisher.com",
  "payment_wallet": "0x...",
  "email": "publisher@example.com"
}
```

#### Step 3: Domain Verification
```bash
# Get verification token
GET /api/v1/publishers/:id/verification-token
Headers: { "Authorization": "Bearer <token>" }

# Verify domain (choose one method)
POST /api/v1/publishers/:id/verify
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "verification_method": "dns",  // or "html" or "file"
  "verification_token": "<token>"
}
```

#### Step 4: Request Ads
```bash
# X402 protocol ad request
GET /x402/ad?pub_id=<publisher_id>&slot_id=slot1&format=banner&geo=US&device=desktop

# Response includes:
# - ad_id
# - creative_url
# - click_url
# - impression_url
```

#### Step 5: Track Events
```bash
# Track impression
POST /track/impression/:adId
Body: {
  "campaign_id": "<campaign_id>",
  "publisher_id": "<publisher_id>",
  "slot_id": "slot1",
  "geo": "US",
  "device": "desktop"
}

# Track click (redirects to landing page)
GET /track/click/:adId?campaign_id=...&publisher_id=...&slot_id=...
```

#### Step 6: View Earnings
```bash
GET /api/v1/publishers/:id/earnings?start_date=2025-01-01&end_date=2025-12-31
Headers: { "Authorization": "Bearer <token>" }
```

---

## 🔄 Complete Flow Example

### End-to-End Test Scenario

1. **Advertiser Journey:**
   - Authenticate → Register → Create Campaign → Fund Campaign
   - Campaign is now active and ready to serve ads

2. **Publisher Journey:**
   - Authenticate → Register → Verify Domain → Request Ads
   - Ads are served via X402 endpoint

3. **Ad Serving:**
   - Publisher requests ad: `GET /x402/ad?pub_id=...&slot_id=...&format=banner`
   - Ad is matched and returned
   - Publisher displays ad on website

4. **Tracking:**
   - Impression tracked: `POST /track/impression/:adId`
   - Click tracked: `GET /track/click/:adId` (redirects to landing page)
   - Revenue calculated and stored

5. **Settlement:**
   - Daily settlement job runs
   - Publisher earnings calculated
   - Payouts executed via PublisherPayout contract

---

## 🧪 Testing

Run the test script:
```bash
node test-customer-journey.js
```

This tests all public endpoints. For authenticated endpoints, use:
- Frontend (recommended - handles wallet interaction)
- Postman/Insomnia with JWT token
- curl with Authorization header

---

## 📝 Notes

- **Authentication:** Requires wallet signature (MetaMask, Coinbase Wallet, etc.)
- **Campaign Funding:** Requires on-chain transaction to PaymentEscrow contract
- **Domain Verification:** Requires actual DNS/HTML/file setup on publisher website
- **Ad Matching:** Requires active campaigns that match publisher criteria
- **Settlement:** Runs automatically via daily job

---

## ✅ Current Status

- ✅ Backend deployed and healthy
- ✅ Database connected
- ✅ Contracts deployed (BASE Sepolia)
- ✅ All public endpoints working
- ✅ Authentication flow ready
- ✅ X402 protocol implemented
- ✅ Tracking endpoints ready

**Ready for full customer journey testing via frontend!** 🚀


