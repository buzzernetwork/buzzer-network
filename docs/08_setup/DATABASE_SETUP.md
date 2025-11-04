# Database Setup Guide

## ✅ Migration System Complete

All database migrations have been created and are ready to run.

## 📋 Migration Files Created

1. **001_create_publishers.ts** - Publishers table
   - Wallet address, email, website URL
   - Domain verification status
   - Quality score
   - Payment wallet

2. **002_create_advertisers.ts** - Advertisers table
   - Wallet address
   - Company information
   - Status

3. **003_create_campaigns.ts** - Campaigns table
   - Campaign details (name, objective, bid model)
   - Budget management
   - Targeting (JSONB for flexibility)
   - Creative information

4. **004_create_ad_slots.ts** - Ad slots table
   - Publisher slots
   - Format and dimensions
   - Status

5. **005_create_impressions.ts** - Impressions table (TimescaleDB)
   - Time-series data for impressions
   - Auto-converts to hypertable if TimescaleDB available
   - Indexed for analytics queries

6. **006_create_clicks.ts** - Clicks table (TimescaleDB)
   - Time-series data for clicks
   - Auto-converts to hypertable
   - Conversion tracking support

7. **007_create_settlements.ts** - Settlements table
   - Publisher payout tracking
   - Transaction hashes
   - Settlement history

## 🚀 Setup Instructions

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14
```

### 2. Install TimescaleDB (Optional but Recommended)

```bash
# macOS
brew install timescaledb

# Ubuntu/Debian
sudo add-apt-repository ppa:timescale/timescaledb-ppa
sudo apt-get update
sudo apt-get install timescaledb-postgresql-14

# Enable extension
sudo timescaledb-tune
```

### 3. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE buzzer_network;

# Connect to database
\c buzzer_network

# Enable TimescaleDB extension (if installed)
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Exit
\q
```

### 4. Configure Environment

Add to `.env`:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/buzzer_network
TIMESCALE_DB_URL=postgresql://username:password@localhost:5432/buzzer_network
```

### 5. Run Migrations

```bash
cd packages/backend
npm run migrate
```

## ✅ Verification

After running migrations, verify tables:

```bash
psql buzzer_network

# List tables
\dt

# Check TimescaleDB hypertables
SELECT * FROM timescaledb_information.hypertables;
```

## 📊 Database Schema

### Core Tables
- `publishers` - Publisher accounts
- `advertisers` - Advertiser accounts
- `campaigns` - Ad campaigns
- `ad_slots` - Publisher ad slots

### Analytics Tables (TimescaleDB)
- `impressions` - Impression events
- `clicks` - Click events

### Financial Tables
- `settlements` - Publisher payouts

## 🔧 Maintenance

### Backup Database
```bash
pg_dump buzzer_network > backup.sql
```

### Restore Database
```bash
psql buzzer_network < backup.sql
```

### Reset Database (Development)
```bash
# Rollback all migrations
npm run migrate:rollback

# Or drop and recreate
dropdb buzzer_network
createdb buzzer_network
npm run migrate
```

## 📝 Notes

- TimescaleDB hypertables provide better performance for time-series queries
- All tables include proper indexes for common query patterns
- Foreign keys ensure data integrity
- Migrations are idempotent (safe to run multiple times)

---

**Database migrations are ready!** 🎉

