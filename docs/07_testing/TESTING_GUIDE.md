# Step-by-Step Testing Guide

## Prerequisites
- ✅ Backend running on `http://localhost:3001`
- ✅ Frontend running on `http://localhost:3000`
- ✅ Database connected
- ✅ Wallet connected in frontend

---

## Step 1: Publisher Registration Flow ✅

### What to Test:
1. Navigate to `/publishers` page
2. Fill out the registration form:
   - Website URL (required): `https://example.com`
   - Email (optional): `publisher@example.com`
   - Payment Wallet (defaults to connected wallet)
3. Click "Register as Publisher"
4. Verify success message appears

### Expected Result:
- ✅ Registration successful
- ✅ Publisher ID returned
- ✅ Status: "pending"
- ✅ Console shows publisher data

### Backend Check:
```bash
# Check if publisher was created
curl -X GET http://localhost:3001/api/v1/publishers/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Common Issues:
- **Error: "Validation failed"** → Check wallet address format
- **Error: "Publisher already exists"** → You've already registered
- **Error: "Unauthorized"** → Token expired, reconnect wallet

---

## Step 2: Domain Verification System

### What to Test:
1. After registration, navigate to `/publishers/verify`
2. Get verification token
3. Choose verification method (DNS, HTML, or File)
4. Complete verification

### Expected Result:
- ✅ Verification token generated
- ✅ Instructions displayed
- ✅ Domain verified successfully
- ✅ Publisher status changes to "approved"

### Backend Endpoints:
- `GET /api/v1/publishers/:id/verification-token` - Get token
- `POST /api/v1/publishers/:id/verify` - Verify domain

### Common Issues:
- **DNS verification fails** → Check DNS propagation (can take time)
- **HTML verification fails** → Check meta tag placement
- **File verification fails** → Check file is accessible at root URL

---

## Step 3: Quality Scoring Algorithm

### What to Test:
1. Check publisher quality score after registration
2. Verify score is calculated (default: 70)
3. Check if score affects campaign matching

### Expected Result:
- ✅ Quality score assigned (default: 70)
- ✅ Score visible in publisher dashboard
- ✅ Score used in matching engine

### Backend Check:
```sql
-- Check quality scores
SELECT id, website_url, quality_score, status FROM publishers;
```

---

## Step 4: Ad Slot Management

### What to Test:
1. Create ad slots for publisher
2. List ad slots
3. Update slot settings

### Expected Result:
- ✅ Slots created successfully
- ✅ Slots listed in dashboard
- ✅ Slot settings can be updated

### Note: Ad slots may need to be implemented if not already done.

---

## Step 5: X402 Ad Serving Endpoint

### What to Test:
1. Make X402 ad request:
```bash
curl "http://localhost:3001/x402/ad?pub_id=YOUR_PUB_ID&slot_id=test&format=banner"
```

### Expected Result:
- ✅ Ad response with creative URL
- ✅ Click and impression URLs provided
- ✅ Format matches request

### Common Issues:
- **404: No matching campaigns** → Need to create campaigns first
- **400: Invalid format** → Use: banner, native, or video

---

## Step 6: Matching Engine

### What to Test:
1. Create advertiser account
2. Create campaign with targeting
3. Request ad for matching publisher
4. Verify correct campaign matched

### Expected Result:
- ✅ Campaign matched based on targeting
- ✅ Highest bid selected
- ✅ Targeting criteria respected

---

## Step 7: Impression Tracking

### What to Test:
1. Call impression tracking URL from ad response
2. Verify impression logged in database
3. Check revenue calculated (CPM)

### Expected Result:
- ✅ Impression logged
- ✅ Revenue calculated for CPM campaigns
- ✅ Campaign spend updated

### Backend Check:
```sql
SELECT * FROM impressions ORDER BY timestamp DESC LIMIT 10;
```

---

## Step 8: Click Tracking System

### What to Test:
1. Click on ad (uses click URL from ad response)
2. Verify redirect to landing page
3. Check click logged in database
4. Verify revenue calculated (CPC)

### Expected Result:
- ✅ Click logged
- ✅ Redirect to landing page
- ✅ Revenue calculated for CPC campaigns
- ✅ Campaign spend updated

### Backend Check:
```sql
SELECT * FROM clicks ORDER BY timestamp DESC LIMIT 10;
```

---

## Step 9: Earnings Calculation

### What to Test:
1. Generate some impressions/clicks
2. Check publisher earnings endpoint
3. Verify earnings calculated correctly

### Expected Result:
- ✅ Total earnings calculated
- ✅ Event count correct
- ✅ Period filtering works

### Test:
```bash
curl -X GET "http://localhost:3001/api/v1/publishers/YOUR_PUB_ID/earnings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Step 10: Payment Settlement System

### What to Test:
1. Run settlement script
2. Verify payouts calculated
3. Check settlement records

### Expected Result:
- ✅ Settlements created
- ✅ Payouts calculated
- ✅ Records in settlements table

### Run Settlement:
```bash
cd packages/backend
npm run settlement
```

---

## Quick Test Commands

### Check Health:
```bash
curl http://localhost:3001/health
```

### Test Auth:
```bash
# Get message
curl -X POST http://localhost:3001/api/v1/auth/message \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_WALLET_ADDRESS"}'
```

### Test X402 Endpoint:
```bash
curl "http://localhost:3001/x402/ad?pub_id=test&slot_id=test&format=banner"
```

---

## Troubleshooting

### Database Issues:
- Check connection: `npm run migrate` in backend
- Verify tables exist: Check migrations ran

### Authentication Issues:
- Clear localStorage token
- Reconnect wallet
- Check JWT_SECRET is set

### CORS Issues:
- Check backend CORS config
- Verify frontend URL in allowed origins

---

**Ready to start testing!** Begin with Step 1 and work through each step systematically.

