/**
 * Migration: Create viewability tracking table
 * Implements IAB/MRC viewability standards (50% visible for 1+ second)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create viewability tracking table
  await knex.schema.createTable('ad_viewability', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('ad_id').notNullable();
    table.uuid('impression_id').nullable().references('id').inTable('impressions').onDelete('SET NULL');
    table.text('slot_id').notNullable();
    table.integer('viewable_time').notNullable(); // milliseconds visible
    table.integer('total_time').notNullable(); // total milliseconds on page
    table.decimal('viewport_percentage', 5, 2).nullable(); // % of ad visible (0-100)
    table.boolean('viewability_met').notNullable(); // true if >= 50% for >= 1s
    table.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes for time-series queries
    table.index('timestamp');
    table.index('ad_id');
    table.index('slot_id');
    table.index(['timestamp', 'slot_id']);
    table.index('viewability_met');
  });
  
  // Convert to TimescaleDB hypertable (if TimescaleDB extension is available)
  const timescaleCheck = await knex.raw(`
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) as exists;
  `).catch(() => ({ rows: [{ exists: false }] }));
  
  if (timescaleCheck.rows?.[0]?.exists) {
    try {
      await knex.raw(`
        SELECT create_hypertable('ad_viewability', 'timestamp', if_not_exists => TRUE);
      `);
      console.log('✓ Converted ad_viewability to TimescaleDB hypertable');
    } catch (error: any) {
      console.log('Note: TimescaleDB extension not available. Table created as regular PostgreSQL table.');
    }
  } else {
    console.log('Note: TimescaleDB extension not available. Table created as regular PostgreSQL table.');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ad_viewability');
}

