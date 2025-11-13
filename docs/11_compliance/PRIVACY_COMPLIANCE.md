# Privacy Compliance Guide

## Overview

This document outlines our GDPR (EU) and CCPA (California) compliance implementation for click tracking and user privacy rights.

## GDPR Compliance (EU)

### Legal Basis for Processing

#### First-Party Tracking (Publishers)
- **Legal Basis:** Legitimate Interest (Art. 6(1)(f) GDPR)
- **Purpose:** Website analytics and ad performance measurement
- **Implementation:** Contextual tracking without cross-site profiling

#### Third-Party Tracking (Cross-Site)
- **Legal Basis:** Consent (Art. 6(1)(a) GDPR)
- **Purpose:** Ad targeting and cross-site measurement
- **Implementation:** Consent banner and cookie management

### GDPR Rights Implementation

#### ✅ Right to Access (Art. 15)

**Endpoint:** `GET /api/v1/privacy/data/:identifier`

Users can request all data associated with their identifier:
- Impression history
- Click history
- Conversion events
- Summary statistics

**Implementation:** `packages/backend/src/routes/privacy.routes.ts`

#### ✅ Right to Erasure (Art. 17) - "Right to be Forgotten"

**Endpoint:** `DELETE /api/v1/privacy/data/:identifier`

Anonymizes user data by:
- Removing IP addresses
- Removing user agents
- Removing session IDs
- Removing referer and page URLs
- Keeping aggregate statistics (no PII)

**Note:** Aggregate data is retained for business purposes but cannot be linked back to individuals.

#### ✅ Right to Object (Art. 21)

**Endpoint:** `POST /api/v1/privacy/opt-out`

Users can opt-out of tracking:
- Immediate opt-out effect
- Persistent in database
- Cached for performance
- Temporary or permanent opt-out

#### ✅ Right to Data Portability (Art. 20)

Data export in JSON format via access endpoint.

### Privacy Modes - ✅ Implemented

Our system supports three privacy modes:

#### 1. Standard Mode
- **When:** User has given consent on first-party site
- **Data Collected:**
  - Full IP address
  - Complete user agent
  - Session tracking
  - Page URLs and referers

#### 2. Privacy-Enhanced Mode  
- **When:** First-party without consent OR cross-site with consent
- **Data Collected:**
  - Hashed IP address (SHA256 + salt)
  - Truncated user agent (browser/OS only)
  - Session tracking (limited)
  - No URLs/referers

#### 3. Minimal Mode
- **When:** Third-party without consent
- **Data Collected:**
  - No IP address
  - No user agent
  - No session tracking
  - Aggregate metrics only

**Implementation:** `packages/backend/src/middleware/consent.middleware.ts`

### Consent Management

#### Consent Detection

Multiple consent sources supported:
1. **Cookie:** `consent_cookie=1`
2. **Header:** `X-Consent: granted`
3. **Query Parameter:** `consent=1` (testing only)

#### Consent Storage

```sql
-- Stored with each tracking event
consent_given BOOLEAN DEFAULT FALSE
privacy_mode ENUM('standard', 'privacy-enhanced', 'minimal')
```

### Data Retention

- **Tracking Data:** 13 months (IAB recommendation)
- **Opt-Out Records:** Permanent or until expiration
- **Audit Logs:** 7 years (legal requirement)

## CCPA Compliance (California)

### Consumer Rights Implementation

#### ✅ Right to Know

Same as GDPR Right to Access.

**Endpoint:** `GET /api/v1/privacy/data/:identifier`

#### ✅ Right to Delete

Same as GDPR Right to Erasure.

**Endpoint:** `DELETE /api/v1/privacy/data/:identifier`

#### ✅ Right to Opt-Out of Sale

**Endpoint:** `POST /api/v1/privacy/opt-out`

**Note:** We don't "sell" personal information in the traditional sense, but opt-out stops all tracking.

#### ✅ Right to Non-Discrimination

Users who opt-out are still served ads, they just aren't tracked.

### "Do Not Sell My Personal Information" Link

Publishers should include on their privacy policy page:

```html
<a href="https://api.buzznetwork.com/privacy/opt-out">
  Do Not Sell My Personal Information
</a>
```

## Privacy-Preserving Technologies

### IP Address Hashing

```typescript
function hashIPAddress(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_HASH_SALT)
    .digest('hex')
    .substring(0, 16);
}
```

- One-way hash (non-reversible)
- Salted for additional security
- Truncated to 16 characters

### User Agent Truncation

```typescript
function truncateUserAgent(userAgent: string): string {
  // Keep only browser and OS, remove version details
  const parts = userAgent.split(' ');
  return parts.slice(0, 2).join(' ');
}
```

Example:
- **Original:** `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0`
- **Truncated:** `Mozilla/5.0 (Windows`

### User Identifier Generation

```typescript
function generateUserIdentifier(req: Request): string {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');
}
```

- Privacy-preserving fingerprint
- No cookies required
- Session-based when in minimal mode

## API Endpoints for Privacy Management

### Check Privacy Status

```bash
GET /api/v1/privacy/status
```

Returns current opt-out status for the requesting user.

### Opt-Out from Tracking

```bash
POST /api/v1/privacy/opt-out
Content-Type: application/json

{
  "source": "user_request",
  "duration_days": 365  // optional, permanent if omitted
}
```

### Access Personal Data

```bash
GET /api/v1/privacy/data/me
```

Returns all data associated with the current user's identifier.

### Delete Personal Data

```bash
DELETE /api/v1/privacy/data/me
```

Anonymizes all data associated with the current user.

## Database Schema

### Privacy Tables

```sql
-- Opt-out tracking
CREATE TABLE privacy_opt_outs (
  id UUID PRIMARY KEY,
  identifier VARCHAR(255) UNIQUE NOT NULL,
  opted_out_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,
  source VARCHAR(50) DEFAULT 'user_request',
  metadata JSONB
);

-- Privacy fields in tracking tables
ALTER TABLE impressions ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE impressions ADD COLUMN privacy_mode VARCHAR(20) DEFAULT 'standard';
ALTER TABLE clicks ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE clicks ADD COLUMN privacy_mode VARCHAR(20) DEFAULT 'standard';
```

### Migrations

- **020_create_conversions.ts** - Conversion tracking table
- **021_add_privacy_fields.ts** - Privacy and consent fields

## Privacy Policy Requirements

Publishers using Buzzer Network must include in their privacy policy:

### Required Disclosures

1. **Data Collection:**
   - What data is collected (IP, user agent, browsing behavior)
   - Purpose of collection (ad measurement)
   - Who has access (advertisers, aggregate only)

2. **Third-Party Services:**
   - Buzzer Network as ad tracking provider
   - Pixalate for fraud detection
   - Link to our privacy policy

3. **User Rights:**
   - Right to access data
   - Right to delete data  
   - Right to opt-out
   - How to exercise rights

4. **Cookie Usage:**
   - Types of cookies used
   - Purpose of each cookie
   - How to disable cookies

### Sample Privacy Policy Text

```markdown
## Advertising and Analytics

We use Buzzer Network to measure the performance of advertisements on our website.
Buzzer Network may collect information about your device and browsing behavior,
including IP address, user agent, and pages visited.

You have the right to:
- Access your data: [link to access endpoint]
- Delete your data: [link to deletion endpoint]
- Opt-out of tracking: [link to opt-out]

For more information, see Buzzer Network's privacy policy at [link].
```

## Compliance Checklist

### Initial Setup
- [x] Implement privacy modes
- [x] Create opt-out mechanism
- [x] Build data access endpoint
- [x] Build data deletion endpoint
- [x] Add consent checking middleware

### Ongoing Compliance
- [ ] Regular privacy audits
- [ ] Data retention policy enforcement
- [ ] User rights request handling (< 30 days)
- [ ] Privacy policy updates
- [ ] Staff training on privacy

### Publisher Requirements
- [ ] Privacy policy disclosure
- [ ] Consent management (if in EU)
- [ ] "Do Not Sell" link (if serving California)
- [ ] Cookie notice
- [ ] Data processing agreement

## Testing Privacy Compliance

### Test Opt-Out Flow

```bash
# 1. Opt out
curl -X POST https://api.buzznetwork.com/api/v1/privacy/opt-out \
  -H "Content-Type: application/json" \
  -d '{"source": "user_request"}'

# 2. Verify tracking is blocked
curl https://api.buzznetwork.com/track/impression/test123 \
  -X POST \
  -d '{"campaign_id": "xxx", "publisher_id": "yyy", "slot_id": "zzz"}'
  
# Should return 403 Forbidden
```

### Test Data Access

```bash
curl https://api.buzznetwork.com/api/v1/privacy/data/me
```

### Test Data Deletion

```bash
curl -X DELETE https://api.buzznetwork.com/api/v1/privacy/data/me
```

## Contact & Data Protection Officer

**Privacy Questions:** privacy@buzznetwork.com  
**Data Protection Officer:** dpo@buzznetwork.com

## References

- **GDPR Full Text:** https://gdpr-info.eu/
- **CCPA Full Text:** https://oag.ca.gov/privacy/ccpa
- **IAB Europe TCF:** https://iabeurope.eu/tcf-2-0/
- **Google Consent Mode:** https://support.google.com/analytics/answer/9976101

## Updates and Changes

This document is reviewed quarterly and updated as needed to reflect:
- Changes in privacy laws
- New privacy features
- Updated best practices
- User feedback

**Last Updated:** 2024-11-13  
**Version:** 1.0

