/**
 * Database Configuration
 * PostgreSQL + TimescaleDB setup
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Primary database (PostgreSQL)
export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// TimescaleDB for analytics (time-series data)
export const timescalePool = new Pool({
  connectionString: process.env.TIMESCALE_DB_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await dbPool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Test TimescaleDB connection
export async function testTimescaleConnection() {
  try {
    const result = await timescalePool.query('SELECT NOW()');
    console.log('✅ TimescaleDB connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ TimescaleDB connection failed:', error);
    return false;
  }
}

