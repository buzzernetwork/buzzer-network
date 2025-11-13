/**
 * Migration: Create slot metrics table
 * Aggregated performance metrics for ad slots
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create slot metrics table
  await knex.schema.createTable('slot_metrics', (table) => {
    table.text('slot_id').notNullable();
    table.date('date').notNullable();
    table.integer('impressions').defaultTo(0);
    table.integer('clicks').defaultTo(0);
    table.decimal('ctr', 5, 4).nullable(); // Click-through rate
    table.decimal('fill_rate', 5, 4).nullable(); // % of requests filled
    table.decimal('viewability_rate', 5, 4).nullable(); // % meeting viewability threshold
    table.decimal('ecpm', 10, 4).nullable(); // Effective CPM
    table.decimal('revenue', 18, 8).defaultTo(0); // Total revenue
    
    // Composite primary key
    table.primary(['slot_id', 'date']);
    
    // Indexes
    table.index('slot_id');
    table.index('date');
    table.index('revenue');
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
        SELECT create_hypertable('slot_metrics', 'date', if_not_exists => TRUE);
      `);
      console.log('✓ Converted slot_metrics to TimescaleDB hypertable');
    } catch (error: any) {
      console.log('Note: TimescaleDB extension not available. Table created as regular PostgreSQL table.');
    }
  } else {
    console.log('Note: TimescaleDB extension not available. Table created as regular PostgreSQL table.');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('slot_metrics');
}

