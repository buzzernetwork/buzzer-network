# Quick Database Setup - Supabase

**Fastest way to get started with Buzzer Network database**

## 🚀 5-Minute Setup

### Step 1: Create Supabase Project (2 min)

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up / Login (GitHub, Google, or email)
4. Click "New Project"
5. Fill in:
   - Project name: `buzzer-network` (or your choice)
   - Database Password: **Save this password!**
   - Region: Choose closest to you
6. Click "Create new project"
7. Wait ~2 minutes for provisioning

### Step 2: Get Connection String (1 min)

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to "Connection string"
3. Select "URI" tab
4. Copy the connection string
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - **Replace `[YOUR-PASSWORD]` with the password you saved**

### Step 3: Configure Environment (1 min)

```bash
cd packages/backend

# Create .env file if it doesn't exist
touch .env

# Add database connection (replace with your actual connection string)
echo "DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" >> .env
echo "DATABASE_SSL=true" >> .env
echo "TIMESCALE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" >> .env
```

Or edit `.env` manually:
```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
DATABASE_SSL=true
TIMESCALE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### Step 4: Run Migrations (1 min)

```bash
cd packages/backend
npm run migrate
```

You should see:
```
✅ Migration 001_create_publishers completed
✅ Migration 002_create_advertisers completed
✅ Migration 003_create_campaigns completed
✅ Migration 004_create_ad_slots completed
✅ Migration 005_create_impressions completed
✅ Migration 006_create_clicks completed
✅ Migration 007_create_settlements completed
```

### Step 5: Verify ✅

```bash
# Start backend
npm run dev

# Check logs for:
# ✅ Database connected
```

Or test in Supabase dashboard:
1. Go to **Table Editor** in Supabase
2. You should see all 7 tables created

---

## 🎉 Done!

Your database is now connected and ready to use!

---

## 🔍 Troubleshooting

### "Connection refused" error
- Check connection string format
- Verify password is correct
- Ensure Supabase project is active

### "SSL required" error
- Set `DATABASE_SSL=true` in `.env`

### Migration errors
- Ensure connection string is correct
- Check Supabase project is fully provisioned
- Verify user has CREATE privileges

### Railway Deployment Issues
- **Note**: If deploying to Railway, use Supabase **Connection Pooler** instead of direct connection
- **Pooler URL**: Get from Supabase Dashboard → Settings → Database → Connection pooling → Transaction mode
- **Why**: Railway may have IPv6 connectivity issues with Supabase direct connections

---

## 📊 What's Created

After migrations, you'll have:
- ✅ `publishers` table
- ✅ `advertisers` table
- ✅ `campaigns` table
- ✅ `ad_slots` table
- ✅ `impressions` table (regular PostgreSQL, no TimescaleDB in Supabase)
- ✅ `clicks` table (regular PostgreSQL)
- ✅ `settlements` table

---

## 🚀 Next Steps

1. Test the API endpoints
2. Register a test publisher
3. Create a test campaign
4. Start serving ads!

---

**Alternative Options:** See `DATABASE_CONNECTION_GUIDE.md` for Neon, Railway, AWS RDS, or local PostgreSQL.

