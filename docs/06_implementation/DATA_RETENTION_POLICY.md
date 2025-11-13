# Data Retention & Archival Policy

## Overview

This document outlines the data retention and archival strategy for Buzz Network, ensuring compliance with industry standards, regulatory requirements, and operational efficiency.

---

## 1. Industry Standards Compliance

### IAB Recommendations:
- **Billing Data:** 18-24 months minimum retention
- **Fraud Data:** 12 months minimum retention  
- **Performance Metrics:** 90 days active, 12+ months archived
- **Click/Impression Logs:** 30-90 days detailed, 12+ months aggregated

### Regulatory Requirements:
- **GDPR:** Right to erasure (30 days)
- **CCPA:** Data deletion upon request
- **Tax Records:** 7 years (financial transactions)
- **Audit Trails:** 3 years minimum

---

## 2. Data Classification & Retention Periods

### Tier 1: Real-Time Data (Hot Storage)
**Retention: 30 days**

| Data Type | Table | Purpose | Notes |
|-----------|-------|---------|-------|
| **Impressions** | `impressions` | Real-time tracking | Full detail |
| **Clicks** | `clicks` | Real-time tracking | Full detail |
| **Ad Requests** | `ad_requests` | Fill rate calculation | New - added for industry compliance |
| **Viewability** | `ad_viewability` | MRC compliance | Detailed metrics |
| **Fraud Logs** | `impressions.fraud_score` | SIVT detection | Pixalate scores |

**Storage:** Primary PostgreSQL database  
**Access:** Direct queries, real-time analytics

---

### Tier 2: Active Analytics (Warm Storage)
**Retention: 31-90 days**

| Data Type | Table | Purpose | Notes |
|-----------|-------|---------|-------|
| **Aggregated Metrics** | `slot_metrics` | Daily rollups | Impressions, clicks, CTR, fill rate, viewability |
| **Campaign Performance** | Derived | Analytics | Campaign-level aggregations |
| **Publisher Performance** | Derived | Analytics | Publisher-level aggregations |

**Storage:** Primary database + time-series optimization (TimescaleDB if available)  
**Access:** Dashboard queries, reporting

**Aggregation Schedule:**
- Hourly aggregation for current day
- Daily aggregation at midnight UTC
- Weekly/monthly rollups for historical analysis

---

### Tier 3: Historical Archive (Cold Storage)
**Retention: 91 days - 24 months**

| Data Type | Purpose | Format | Access Pattern |
|-----------|---------|--------|----------------|
| **Archived Impressions** | Audit & billing disputes | Compressed | Infrequent |
| **Archived Clicks** | Audit & billing disputes | Compressed | Infrequent |
| **Settlement Records** | Financial compliance | Full detail | Regulatory |
| **Fraud Reports** | Pattern analysis | Aggregated | Investigation |

**Storage:** Cloud archive (S3/Glacier) or compressed database partition  
**Access:** Manual queries, audit requests, dispute resolution

**Implementation Options:**
1. **PostgreSQL Partitioning:**
   - Partition by month
   - Detach old partitions
   - Compress with pg_dump

2. **External Archive:**
   - Export to Parquet/CSV
   - Store in S3/IPFS
   - Delete from primary database

3. **TimescaleDB Compression:**
   - Automatic chunk compression
   - Transparent query access
   - Optimal storage efficiency

---

### Tier 4: Permanent Records
**Retention: 24+ months (or indefinitely)**

| Data Type | Table | Purpose | Compliance |
|-----------|-------|---------|------------|
| **Settlements** | `settlements` | Financial records | Tax law (7 years) |
| **Contracts** | `campaigns` | Business records | Legal disputes |
| **User Accounts** | `publishers`, `advertisers` | Account management | Until deletion request |
| **Audit Logs** | TBD | Compliance | 3 years |

**Storage:** Primary database (critical), encrypted backups  
**Access:** Available for compliance, audit, legal

---

## 3. Data Lifecycle Automation

### Automated Processes

#### Daily (00:00 UTC):
```
1. Aggregate yesterday's metrics → slot_metrics table
2. Update publisher/campaign summaries
3. Mark records >30 days for archival
```

#### Weekly (Sunday 00:00 UTC):
```
1. Archive impression/click data >30 days old
2. Generate weekly rollup reports
3. Validate archival integrity
4. Clean up temporary tracking data
```

#### Monthly (1st of month):
```
1. Archive impression/click data >90 days old
2. Compress historical partitions
3. Generate monthly compliance report
4. Review storage costs vs. retention value
```

#### Quarterly:
```
1. Audit compliance with retention policy
2. Process data deletion requests (GDPR/CCPA)
3. Review and update retention periods
```

---

## 4. Archival Implementation Strategy

### Phase 1: Database Partitioning (Immediate)

```sql
-- Example: Partition impressions table by month
CREATE TABLE impressions_2025_01 PARTITION OF impressions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE impressions_2025_02 PARTITION OF impressions
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Detach old partitions after 90 days
ALTER TABLE impressions DETACH PARTITION impressions_2024_08;

-- Archive detached partition
pg_dump -t impressions_2024_08 -Fc database_name > impressions_2024_08.dump
```

### Phase 2: Automated Archival Script

```typescript
// packages/backend/src/scripts/archive-old-data.ts
export async function archiveOldData(olderThanDays: number): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // Export to archive storage
  const impressions = await exportToArchive('impressions', cutoffDate);
  const clicks = await exportToArchive('clicks', cutoffDate);
  
  // Verify archive integrity
  await verifyArchive(impressions);
  await verifyArchive(clicks);
  
  // Delete from primary database
  await deleteArchivedData('impressions', cutoffDate);
  await deleteArchivedData('clicks', cutoffDate);
  
  console.log(`Archived ${impressions.count} impressions, ${clicks.count} clicks`);
}
```

### Phase 3: Cloud Archive Integration

**Storage Options:**
1. **AWS S3 + Glacier:**
   - Standard: 90-day archives
   - Glacier: 24+ month archives
   - Cost: ~$0.004/GB/month (Glacier)

2. **IPFS/Filecoin:**
   - Decentralized storage
   - Immutable records
   - Blockchain-aligned

3. **Local Compressed Storage:**
   - PostgreSQL compressed partitions
   - Cost-effective for smaller scale

---

## 5. Data Deletion & GDPR Compliance

### User Data Deletion Requests

#### Publisher/Advertiser Account Deletion:
```
1. Mark account for deletion
2. 30-day grace period (accidental deletions)
3. After 30 days:
   - Anonymize personal data (wallet address → hashed ID)
   - Retain financial records (settlements, payments) - required by law
   - Delete optional profile data (name, email, etc.)
   - Flag impressions/clicks as "anonymized user"
```

#### Data Subject Rights:
- **Right to Access:** Export all user data in JSON format
- **Right to Erasure:** Anonymize within 30 days (with legal exceptions for financial records)
- **Right to Portability:** Provide machine-readable export
- **Right to Rectification:** Allow profile updates

### Implementation:

```typescript
// packages/backend/src/services/gdpr.service.ts
export async function processDataDeletionRequest(userId: string, userType: 'publisher' | 'advertiser'): Promise<void> {
  // Mark for deletion
  await dbPool.query(
    `UPDATE ${userType}s 
     SET deletion_requested_at = NOW(), 
         status = 'pending_deletion'
     WHERE id = $1`,
    [userId]
  );
  
  // Schedule deletion for 30 days from now
  scheduleTask('delete-user-data', userId, 30 * 24 * 60 * 60 * 1000);
}

export async function executeDataDeletion(userId: string, userType: 'publisher' | 'advertiser'): Promise<void> {
  // Anonymize impressions/clicks (keep for statistics but remove PII)
  await dbPool.query(
    `UPDATE impressions 
     SET publisher_id = 'DELETED_USER', 
         ip_address = NULL, 
         user_agent = NULL
     WHERE ${userType}_id = $1`,
    [userId]
  );
  
  // Delete account (but retain settlements for tax compliance)
  await dbPool.query(
    `UPDATE ${userType}s 
     SET wallet_address = NULL,
         email = NULL,
         status = 'deleted',
         deleted_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}
```

---

## 6. Monitoring & Compliance Reporting

### Metrics to Track:

1. **Storage Growth:**
   - Impressions per day
   - Storage used vs. quota
   - Archive success rate

2. **Retention Compliance:**
   - Records outside retention period
   - Failed archival jobs
   - Data deletion queue length

3. **Access Patterns:**
   - Archive access frequency
   - Query performance (hot vs. cold)
   - Cost per query

### Monthly Compliance Report:

```
Buzz Network - Data Retention Compliance Report
Month: January 2025

1. Hot Storage (0-30 days):
   - Impressions: 5.2M records (12.3 GB)
   - Clicks: 52K records (1.1 GB)
   - Fill rate: 98.7%

2. Warm Storage (31-90 days):
   - Aggregated metrics: 180 daily records (2.1 MB)
   - Query performance: <50ms avg

3. Cold Storage (91-730 days):
   - Archived impressions: 45M records (87 GB compressed)
   - Archive access: 12 queries (3 disputes resolved)

4. Permanent Records:
   - Settlements: 1,234 records (never deleted)
   - User accounts: 567 active, 12 pending deletion

5. GDPR Requests:
   - Data access: 3 requests (fulfilled in <48h)
   - Data deletion: 2 requests (completed)
   - Data portability: 1 request (fulfilled)

6. Recommendations:
   - Archive storage stable
   - No compliance issues
   - Consider TimescaleDB for better compression
```

---

## 7. Cost Optimization

### Current Estimate (at scale):

| Storage Tier | Volume | Cost/Month | Notes |
|--------------|--------|------------|-------|
| **Hot (Primary DB)** | 50 GB | $50 | PostgreSQL on Railway/Supabase |
| **Warm (Metrics)** | 5 GB | Included | Same database |
| **Cold (S3 Standard)** | 200 GB | $5 | After 90 days |
| **Archive (Glacier)** | 2 TB | $8 | After 12 months |
| **Total** | ~2.25 TB | **$63/month** | Scales with usage |

### Optimization Strategies:

1. **Aggressive Compression:**
   - Parquet format: 90% size reduction
   - pg_dump compressed: 80% reduction

2. **Selective Archival:**
   - Only archive verified events
   - Discard fraud traffic after 90 days

3. **Smart Querying:**
   - Query aggregated metrics first
   - Only fetch raw data when necessary

4. **TimescaleDB Chunks:**
   - Automatic compression
   - Transparent query optimization
   - 95% compression for old data

---

## 8. Implementation Timeline

### Q1 2025: Foundation
- [x] Define retention policy (this document)
- [ ] Implement slot_metrics aggregation (done)
- [ ] Implement ad_requests tracking (done)
- [ ] Create archival script template

### Q2 2025: Automation
- [ ] Set up database partitioning
- [ ] Implement automated daily/weekly archival
- [ ] Create GDPR deletion workflows
- [ ] Set up monitoring dashboard

### Q3 2025: Optimization
- [ ] Migrate to TimescaleDB (if needed)
- [ ] Implement cloud archive (S3/Glacier)
- [ ] Optimize query performance
- [ ] Cost analysis & tuning

### Q4 2025: Compliance Audit
- [ ] External compliance audit
- [ ] Update policy based on findings
- [ ] Document lessons learned
- [ ] Plan for 2026

---

## 9. Success Metrics

### Operational:
- ✅ Archive success rate >99.9%
- ✅ Hot storage query latency <100ms
- ✅ Archive retrieval time <1 hour
- ✅ Storage cost growth <20% YoY

### Compliance:
- ✅ Zero data retention violations
- ✅ GDPR deletion requests <30 days
- ✅ Audit trail completeness 100%
- ✅ Backup recovery time <4 hours

### Financial:
- ✅ Storage cost per impression <$0.0001
- ✅ Archive storage cost <$100/month
- ✅ Query costs <$50/month

---

## 10. Responsible Parties

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Backend Team** | Implementation, automation | dev@buzznetwork.io |
| **DevOps** | Infrastructure, monitoring | devops@buzznetwork.io |
| **Compliance Officer** | Policy updates, audits | compliance@buzznetwork.io |
| **Legal** | GDPR/CCPA compliance | legal@buzznetwork.io |

---

## 11. Review & Updates

**Review Schedule:** Quarterly  
**Next Review:** April 2025  
**Document Owner:** Backend Lead  
**Last Updated:** November 2025

### Change Log:
- **Nov 2025:** Initial policy created
- **Jan 2026:** (Planned) Add TimescaleDB compression
- **Apr 2026:** (Planned) First compliance audit

---

## 12. References

- [IAB Tech Lab - Traffic Quality Guidelines](https://iabtechlab.com/standards/traffic-quality-guidelines/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [PostgreSQL Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [TimescaleDB Compression](https://docs.timescale.com/use-timescale/latest/compression/)
- [AWS Glacier Pricing](https://aws.amazon.com/s3/pricing/)

---

**Document Version:** 1.0  
**Status:** Active  
**Classification:** Internal - Operations

