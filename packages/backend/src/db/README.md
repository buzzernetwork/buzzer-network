# Database Migrations

## Setup

1. Ensure PostgreSQL is running
2. Create database: `createdb buzzer_network`
3. (Optional) Install TimescaleDB extension: `CREATE EXTENSION IF NOT EXISTS timescaledb;`
4. Set `DATABASE_URL` in `.env`

## Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

## Migration Files

- `001_create_publishers.ts` - Publishers table
- `002_create_advertisers.ts` - Advertisers table
- `003_create_campaigns.ts` - Campaigns table
- `004_create_ad_slots.ts` - Ad slots table
- `005_create_impressions.ts` - Impressions (TimescaleDB hypertable)
- `006_create_clicks.ts` - Clicks (TimescaleDB hypertable)
- `007_create_settlements.ts` - Settlements table

## Notes

- TimescaleDB hypertables are created automatically if extension is available
- If TimescaleDB is not available, tables work as regular PostgreSQL tables
- All migrations include proper indexes for performance

