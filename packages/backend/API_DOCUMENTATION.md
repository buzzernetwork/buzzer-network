# Buzzer Network API Documentation

**Version**: 0.1.0  
**Base URL**: `http://localhost:3001`

---

## Authentication

All authenticated endpoints require wallet signature verification or JWT token.

### Wallet Authentication Flow

1. Generate auth message:
   ```
   POST /api/v1/auth/message
   Body: { address: "0x..." }
   ```

2. User signs message with wallet

3. Submit signature:
   ```
   POST /api/v1/auth/verify
   Body: { address, message, signature }
   Response: { token: "jwt_token" }
   ```

4. Use token in subsequent requests:
   ```
   Authorization: Bearer <jwt_token>
   ```

---

## Endpoints

### Health Check

**GET** `/health`

Returns server status and database connection.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T...",
  "service": "buzzer-network-backend",
  "version": "0.1.0",
  "database": "connected"
}
```

---

### X402 Ad Serving

**GET** `/x402/ad`

X402-compliant ad serving endpoint.

**Query Parameters:**
- `pub_id` (required): Publisher ID
- `slot_id` (required): Ad slot ID
- `format` (required): `banner` | `native` | `video`
- `geo` (optional): Country code
- `device` (optional): `desktop` | `mobile` | `tablet`

**Success Response (200):**
```json
{
  "ad_id": "AD_XXX",
  "creative_url": "https://...",
  "format": "banner",
  "width": 300,
  "height": 250,
  "click_url": "https://.../track/click/AD_XXX",
  "impression_url": "https://.../track/impression/AD_XXX"
}
```

**Payment Required (402):**
```json
{
  "error": "Payment Required",
  "payment_address": "0x...",
  "amount": "0.001",
  "token": "ETH",
  "x402_payment_url": "https://..."
}
```

---

### Tracking

#### POST `/track/impression/:adId`

Log an impression event.

**Body:**
```json
{
  "campaign_id": "uuid",
  "publisher_id": "uuid",
  "slot_id": "string",
  "geo": "US",
  "device": "desktop"
}
```

**Response:**
```json
{
  "success": true,
  "impression_id": "uuid",
  "ad_id": "AD_XXX"
}
```

#### GET `/track/click/:adId`

Log a click event and redirect to advertiser landing page.

**Query Parameters:**
- `campaign_id` (required)
- `publisher_id` (required)
- `slot_id` (required)
- `geo` (optional)
- `device` (optional)

**Response:** Redirects to advertiser landing page

---

### Publishers

#### POST `/api/v1/publishers`

Register a new publisher.

**Authentication:** Required (wallet signature)

**Body:**
```json
{
  "website_url": "https://example.com",
  "email": "publisher@example.com",
  "payment_wallet": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "publisher": {
    "id": "uuid",
    "wallet_address": "0x...",
    "website_url": "https://example.com",
    "status": "pending",
    "quality_score": null,
    "created_at": "2025-01-27T..."
  }
}
```

#### GET `/api/v1/publishers/me`

Get current publisher's information.

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "publisher": {
    "id": "uuid",
    "wallet_address": "0x...",
    "website_url": "https://example.com",
    "domain_verified": false,
    "quality_score": 75,
    "status": "approved",
    "payment_wallet": "0x...",
    "created_at": "2025-01-27T...",
    "updated_at": "2025-01-27T..."
  }
}
```

#### POST `/api/v1/publishers/:id/verify`

Verify domain ownership.

**Authentication:** Required

**Body:**
```json
{
  "verification_method": "dns" | "html" | "file"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain verified successfully",
  "verified": true
}
```

#### GET `/api/v1/publishers/:id/earnings`

Get publisher earnings.

**Authentication:** Required

**Query Parameters:**
- `start_date` (optional): ISO date string
- `end_date` (optional): ISO date string

**Response:**
```json
{
  "publisher_id": "uuid",
  "earnings": {
    "total": 0.5,
    "event_count": 1000
  },
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  }
}
```

---

### Advertisers

#### POST `/api/v1/advertisers`

Register a new advertiser.

**Authentication:** Required (wallet signature)

**Body:**
```json
{
  "company_name": "Example Corp",
  "website_url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "advertiser": {
    "id": "uuid",
    "wallet_address": "0x...",
    "company_name": "Example Corp",
    "status": "active",
    "created_at": "2025-01-27T..."
  }
}
```

#### POST `/api/v1/advertisers/campaigns`

Create a new campaign.

**Authentication:** Required

**Body:**
```json
{
  "name": "Summer Sale Campaign",
  "objective": "awareness" | "clicks" | "conversions",
  "bid_model": "CPM" | "CPC",
  "bid_amount": 0.01,
  "total_budget": 100.0,
  "daily_budget": 10.0,
  "targeting": {
    "geo": ["US", "CA"],
    "categories": ["tech", "finance"],
    "quality_min": 70,
    "devices": ["desktop", "mobile"]
  },
  "creative_url": "https://...",
  "creative_format": "banner" | "native" | "video",
  "landing_page_url": "https://...",
  "start_date": "2025-02-01",
  "end_date": "2025-02-28"
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Summer Sale Campaign",
    "objective": "awareness",
    "bid_model": "CPM",
    "bid_amount": "0.01",
    "status": "draft",
    "created_at": "2025-01-27T..."
  },
  "message": "Campaign created. Fund the campaign to activate."
}
```

#### GET `/api/v1/advertisers/campaigns`

Get all campaigns for current advertiser.

**Authentication:** Required

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "Summer Sale Campaign",
      "objective": "awareness",
      "bid_model": "CPM",
      "bid_amount": "0.01",
      "total_budget": "100.0",
      "spent_budget": "25.5",
      "status": "active",
      "targeting": {...},
      "creative_url": "https://...",
      "creative_format": "banner",
      "created_at": "2025-01-27T..."
    }
  ]
}
```

#### PATCH `/api/v1/advertisers/campaigns/:id`

Update campaign (pause, resume, update budget).

**Authentication:** Required

**Body:**
```json
{
  "status": "paused" | "active" | "ended",
  "total_budget": 150.0,
  "daily_budget": 15.0
}
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "status": "paused",
    "total_budget": "150.0",
    "daily_budget": "15.0"
  }
}
```

---

## Error Responses

All endpoints may return these error responses:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [...]
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Error details"
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `402` - Payment Required (X402 protocol)
- `500` - Internal Server Error

---

## Notes

- All wallet addresses must be valid Ethereum addresses (0x...)
- Campaign status: `draft` → `active` (after funding) → `paused` | `ended`
- Publisher status: `pending` → `approved` (after verification) | `rejected` | `suspended`
- Earnings are calculated in real-time from impressions and clicks
- Campaign budgets are tracked in ETH (or configured token)

---

**Last Updated**: 2025-01-27

