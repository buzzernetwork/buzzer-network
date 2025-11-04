/**
 * Migration: Create impressions table (TimescaleDB hypertable)
 * This table stores impression events for analytics
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create impressions table
  await knex.schema.createTable('impressions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('ad_id', 50).notNullable();
    table.uuid('campaign_id').references('id').inTable('campaigns').onDelete('SET NULL');
    table.uuid('publisher_id').references('id').inTable('publishers').onDelete('SET NULL');
    table.string('slot_id', 50).notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
    table.string('geo', 2).nullable(); // Country code
    table.string('device', 20).nullable(); // desktop/mobile/tablet
    table.boolean('verified').defaultTo(true);
    table.decimal('revenue', 18, 8).nullable(); // Calculated earnings
    
    // Indexes for time-series queries
    table.index('timestamp');
    table.index('campaign_id');
    table.index('publisher_id');
    table.index(['timestamp', 'publisher_id']);
    table.index(['timestamp', 'campaign_id']);
  });
  
  // Convert to TimescaleDB hypertable (if TimescaleDB extension is available)
  // Check if TimescaleDB extension exists first
  const timescaleCheck = await knex.raw(`
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) as exists;
  `).catch(() => ({ rows: [{ exists: false }] }));
  
  if (timescaleCheck.rows?.[0]?.exists) {
    try {
      await knex.raw(`
        SELECT create_hypertable('impressions', 'timestamp', if_not_exists => TRUE);
      `);
    } catch (error: any) {
      // If TimescaleDB is not available, table will still work as regular PostgreSQL
      console.log('Note: TimescaleDB extension not available. Table created as regular PostgreSQL table.');
    }
  } else {
    console.log('Note: TimescaleDB extension not available. Table created as regular PostgreSQL table.');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('impressions');
}

