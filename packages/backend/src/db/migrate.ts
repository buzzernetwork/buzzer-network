/**
 * Migration runner script
 * Run migrations: npm run migrate
 */

import knex, { Knex } from 'knex';
import config from './knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment] as Knex.Config);

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    await db.migrate.latest();
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

