# Database Connection Guide

**Buzzer Network supports multiple PostgreSQL database options:**

## 🎯 Quick Start Options

### Option 1: Supabase (Recommended for Quick Start) ⭐

**Pros:**
- ✅ Free tier available
- ✅ Managed PostgreSQL (no setup needed)
- ✅ Built-in dashboard
- ✅ Automatic backups
- ✅ SSL connections included
- ✅ API access
- ⚠️ TimescaleDB: Not available (but can work without it)

**Setup Steps:**

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Sign up / Login
   - Create new project
   - Wait for database to provision (~2 minutes)

2. **Get Connection String**
   - Go to Project Settings → Database
   - Copy "Connection string" (URI format)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

3. **Configure Environment**
   ```bash
   # In packages/backend/.env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   DATABASE_SSL=true
   TIMESCALE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

4. **Run Migrations**
   ```bash
   cd packages/backend
   npm run migrate
   ```

**Note:** Supabase doesn't support TimescaleDB extension, but the migrations will still work - time-series tables will be created as regular PostgreSQL tables.

---

### Option 2: Local PostgreSQL (For Development)

**Pros:**
- ✅ Full control
- ✅ Free
- ✅ Can install TimescaleDB
- ✅ Fast local development

**Setup Steps:**

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database**
   ```bash
   createdb buzzer_network
   ```

3. **Optional: Install TimescaleDB** (for better analytics performance)
   ```bash
   # macOS
   brew install timescaledb
   
   # Then enable extension
   psql buzzer_network
   CREATE EXTENSION IF NOT EXISTS timescaledb;
   ```

4. **Configure Environment**
   ```bash
   # In packages/backend/.env
   DATABASE_URL=postgresql://localhost:5432/buzzer_network
   DATABASE_SSL=false
   TIMESCALE_DB_URL=postgresql://localhost:5432/buzzer_network
   ```

5. **Run Migrations**
   ```bash
   cd packages/backend
   npm run migrate
   ```

---

### Option 3: Neon (Recommended for Production-Ready Cloud)

**Pros:**
- ✅ Serverless PostgreSQL
- ✅ Free tier available
- ✅ Automatic scaling
- ✅ Branching (git-like database branches)
- ✅ Supports TimescaleDB extension
- ✅ Great for development and production

**Setup Steps:**

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up / Login
   - Create new project

2. **Get Connection String**
   - Copy connection string from dashboard
   - Format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`

3. **Configure Environment**
   ```bash
   # In packages/backend/.env
   DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   DATABASE_SSL=true
   TIMESCALE_DB_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```

4. **Enable TimescaleDB** (if needed)
   ```sql
   -- Connect via Neon SQL editor
   CREATE EXTENSION IF NOT EXISTS timescaledb;
   ```

5. **Run Migrations**
   ```bash
   cd packages/backend
   npm run migrate
   ```

---

### Option 4: Railway

**Pros:**
- ✅ Easy setup
- ✅ Free tier
- ✅ Automatic deployments
- ✅ PostgreSQL + Redis included

**Setup Steps:**

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up / Login
   - Create new project → Add PostgreSQL

2. **Get Connection String**
   - Copy connection string from service
   - Format: `postgresql://[user]:[password]@[host]:[port]/[database]`

3. **Configure Environment**
   ```bash
   # In packages/backend/.env
   DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
   DATABASE_SSL=true
   ```

4. **Run Migrations**
   ```bash
   cd packages/backend
   npm run migrate
   ```

---

### Option 5: AWS RDS (Production)

**Pros:**
- ✅ Enterprise-grade
- ✅ Scalable
- ✅ Supports TimescaleDB
- ✅ High availability

**Setup Steps:**

1. **Create RDS Instance**
   - AWS Console → RDS
   - Create PostgreSQL instance
   - Enable TimescaleDB extension support

2. **Configure Security Groups**
   - Allow inbound connections from your IP

3. **Get Connection String**
   ```bash
   DATABASE_URL=postgresql://[user]:[password]@[endpoint]:5432/[database]
   DATABASE_SSL=true
   ```

---

## 🔧 Configuration

### Environment Variables

Create `packages/backend/.env`:

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_SSL=true  # Set to false for local without SSL

# TimescaleDB (optional - same as DATABASE_URL if using same instance)
TIMESCALE_DB_URL=postgresql://user:password@host:port/database

# Redis (for caching)
REDIS_URL=redis://localhost:6379
```

### SSL Configuration

For cloud databases (Supabase, Neon, Railway, etc.):
```bash
DATABASE_SSL=true
```

For local development:
```bash
DATABASE_SSL=false
```

The code automatically handles SSL based on this setting.

---

## ✅ Verification

After setting up connection, verify it works:

```bash
cd packages/backend

# Test connection
npm run dev
# Check logs for: "✅ Database connected"

# Or test directly
node -e "require('./dist/config/database.js').testDatabaseConnection().then(r => console.log(r ? '✅ Connected' : '❌ Failed'))"
```

---

## 🚀 Running Migrations

Once connected, run migrations:

```bash
cd packages/backend
npm run migrate
```

This will create all tables:
- `publishers`
- `advertisers`
- `campaigns`
- `ad_slots`
- `impressions` (TimescaleDB hypertable if available)
- `clicks` (TimescaleDB hypertable if available)
- `settlements`

---

## 📊 TimescaleDB Support

**What is TimescaleDB?**
- Extension for PostgreSQL optimized for time-series data
- Better performance for analytics queries
- Required for: `impressions` and `clicks` tables

**Options:**
1. **With TimescaleDB**: Better performance for analytics
2. **Without TimescaleDB**: Still works, regular PostgreSQL tables

The migrations automatically detect if TimescaleDB is available and create hypertables if possible.

---

## 🎯 Recommended Setup by Use Case

### Development / Quick Start
**→ Supabase** (easiest, free tier)

### Production MVP
**→ Neon** (scalable, supports TimescaleDB)

### Enterprise
**→ AWS RDS** (full control, high availability)

### Local Development
**→ Local PostgreSQL** (fastest, full control)

---

## 🔍 Troubleshooting

### Connection Refused
- Check if database is running (for local)
- Verify connection string format
- Check firewall/security groups (for cloud)

### SSL Error
- Set `DATABASE_SSL=true` for cloud databases
- Set `DATABASE_SSL=false` for local development

### Migration Errors
- Ensure database user has CREATE privileges
- Check if TimescaleDB extension exists (if using)
- Verify connection string is correct

### TimescaleDB Not Available
- Migrations will still work
- Tables created as regular PostgreSQL
- Analytics queries may be slower

---

## 📝 Next Steps

1. Choose your database option
2. Set up connection string in `.env`
3. Run migrations: `npm run migrate`
4. Test connection
5. Start using the API!

---

**Need help?** Check `DATABASE_SETUP.md` for more details.

