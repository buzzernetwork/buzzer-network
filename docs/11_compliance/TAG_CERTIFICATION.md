# TAG Certification Requirements

## Overview

This document outlines the requirements for Trustworthy Accountability Group (TAG) "Certified Against Fraud" certification and our implementation status.

## TAG Requirements Checklist

### 1. Invalid Traffic (IVT) Detection

#### GIVT (General Invalid Traffic) - ✅ Implemented

- [x] Bot and spider detection via user agent analysis
- [x] Data center IP filtering
- [x] Rate-based traffic filtering
- [x] Known crawler lists
- [x] Pre-filtering before SIVT checks

**Implementation:** `packages/backend/src/services/givt-filter.service.ts`

#### SIVT (Sophisticated Invalid Traffic) - ✅ Implemented

- [x] Third-party fraud detection integration (Pixalate)
- [x] IP reputation scoring
- [x] Behavioral analysis
- [x] Pattern detection
- [x] Fraud score thresholds (0.0-1.0)

**Implementation:** `packages/backend/src/services/pixalate.service.ts`

### 2. Fraud Detection Thresholds - ✅ Implemented

- [x] Clean traffic: fraud_score < 0.5
- [x] Suspicious traffic: 0.5 ≤ fraud_score < 0.7
- [x] Fraud traffic: fraud_score ≥ 0.7
- [x] Blocked traffic: fraud_score ≥ 0.9

**Configuration:** `packages/backend/src/config/tracking-config.ts`

### 3. IVT Reporting - ✅ Implemented

- [x] Daily IVT summaries
- [x] GIVT vs SIVT breakdown
- [x] Publisher-level IVT reports
- [x] Campaign-level IVT reports
- [x] CSV export for audits
- [x] Detection method breakdown

**Implementation:** `packages/backend/src/services/ivt-reporting.service.ts`

### 4. Time-Based Fraud Detection - ✅ Implemented

- [x] Click timing validation (<1 second = suspicious)
- [x] Impression-to-click correlation
- [x] Fast click detection
- [x] No impression validation

**Implementation:** `packages/backend/src/routes/tracking.routes.ts` (lines 386-409)

### 5. Deduplication - ✅ Implemented

- [x] 24-hour impression deduplication window (IAB standard)
- [x] 24-hour click deduplication window (IAB standard)
- [x] Unique impression IDs
- [x] Redis-based idempotency

**Implementation:** `packages/backend/src/routes/tracking.routes.ts`

### 6. Transparent Reporting - ✅ Implemented

- [x] Real-time fraud status logging
- [x] Structured logging with fraud details
- [x] Audit trail preservation
- [x] API endpoints for report access

**Implementation:** `packages/backend/src/routes/reports.routes.ts`

## TAG API Endpoints for Auditors

### IVT Summary Report

```bash
GET /api/v1/reports/ivt?start_date=2024-01-01&end_date=2024-01-31&format=csv
Authorization: Bearer <token>
```

Returns TAG-compliant CSV with:
- Daily traffic totals
- GIVT/SIVT breakdowns
- Detection method details
- Invalid traffic rates

### Publisher IVT Report

```bash
GET /api/v1/reports/ivt/publishers?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

Returns IVT statistics by publisher for quality scoring.

### Campaign IVT Report

```bash
GET /api/v1/reports/ivt/campaigns?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

Returns IVT statistics by campaign for advertiser transparency.

## Fraud Detection Pipeline

### Impression Tracking

1. **GIVT Pre-Filter** (40-60% reduction)
   - Bot user agent check
   - Data center IP check
   - Rate limiting check

2. **SIVT Detection** (15% sampling)
   - Pixalate API call
   - Fraud score calculation
   - Status determination

3. **Revenue Decision**
   - Clean (< 0.5): Count revenue
   - Suspicious (0.5-0.7): Track but don't count revenue
   - Fraud (≥ 0.7): Don't track
   - Block (≥ 0.9): Reject request

### Click Tracking

1. **GIVT Pre-Filter**
   - Same as impressions

2. **Time-Based Validation**
   - Check impression timestamp
   - Validate click timing (>1 second)
   - Verify impression exists

3. **SIVT Detection** (100% of clicks)
   - Pixalate API call
   - Combined fraud status (time + Pixalate)

4. **Revenue Decision**
   - Same thresholds as impressions

## IVT Metrics

### Target Benchmarks (Industry Standard)

- **Overall IVT Rate:** < 5%
- **GIVT Rate:** < 3%
- **SIVT Rate:** < 2%

### Current Performance

Check via:
```bash
GET /api/v1/reports/ivt/stats?start_date=<date>&end_date=<date>
```

## Database Schema for IVT Tracking

### Fraud Scores in Tracking Tables

```sql
-- impressions table
fraud_score DECIMAL(3,2)  -- 0.00 to 1.00
fraud_status ENUM('clean', 'suspicious', 'fraud')

-- clicks table  
fraud_score DECIMAL(3,2)
fraud_status ENUM('clean', 'suspicious', 'fraud')
```

### Indexes for IVT Queries

```sql
CREATE INDEX idx_impressions_fraud_status ON impressions(fraud_status);
CREATE INDEX idx_impressions_fraud_score ON impressions(fraud_score);
CREATE INDEX idx_clicks_fraud_status ON clicks(fraud_status);
CREATE INDEX idx_clicks_fraud_score ON clicks(fraud_score);
```

## TAG Audit Preparation

### Required Documentation

1. **IVT Detection Methodology** - This document
2. **Last 30 Days IVT Report** - Available via API
3. **Fraud Vendor Integration** - Pixalate integration details
4. **Sample Size Documentation** - 15% impressions, 100% clicks
5. **Threshold Justification** - Industry-standard thresholds

### Sample Audit Queries

```sql
-- Daily IVT summary
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total_traffic,
  COUNT(*) FILTER (WHERE fraud_status = 'clean') as valid_traffic,
  COUNT(*) FILTER (WHERE fraud_status IN ('suspicious', 'fraud')) as invalid_traffic,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fraud_status IN ('suspicious', 'fraud')) / COUNT(*), 2) as ivt_rate
FROM impressions
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

## Next Steps for Certification

1. ✅ Implement all fraud detection measures
2. ✅ Create IVT reporting system
3. ⏳ Run 30-day baseline measurement
4. ⏳ Document all procedures
5. ⏳ Submit TAG application
6. ⏳ Pass TAG audit

## Maintenance Requirements

### Monthly Tasks

- [ ] Review IVT rates and trends
- [ ] Update bot/crawler lists
- [ ] Audit fraud detection accuracy
- [ ] Generate TAG compliance report

### Quarterly Tasks

- [ ] Pixalate integration health check
- [ ] Fraud threshold optimization
- [ ] Publisher quality review
- [ ] Campaign IVT analysis

### Annual Tasks

- [ ] TAG re-certification
- [ ] Comprehensive system audit
- [ ] Fraud detection methodology review
- [ ] Update to latest TAG standards

## Contact Information

**TAG Website:** https://www.tagtoday.net/
**TAG Certification Program:** https://www.tagtoday.net/certification

## References

- TAG Fraud Measurement Guidelines
- IAB Click Measurement Guidelines
- MRC Invalid Traffic Detection Standards
- Pixalate Fraud Detection Documentation

