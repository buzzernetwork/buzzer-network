/**
 * Migration: Create conversions table
 * Tracks post-click conversions with attribution windows
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conversions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('click_id').nullable(); // May be null if click record is old/deleted
    table.string('impression_id', 50).notNullable().index(); // Link to original impression
    table.uuid('campaign_id').references('id').inTable('campaigns').onDelete('SET NULL');
    table.uuid('publisher_id').references('id').inTable('publishers').onDelete('SET NULL');
    table.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
    
    // Conversion details
    table.decimal('conversion_value', 18, 8).nullable().comment('Value of conversion in ETH');
    table.string('conversion_type', 50).notNullable().comment('Type: purchase, signup, lead, etc');
    table.jsonb('conversion_data').nullable().comment('Additional conversion metadata');
    
    // Attribution tracking
    table.boolean('attributed_within_window').defaultTo(true).comment('Was conversion within attribution window');
    table.integer('attribution_window_days').notNullable().defaultTo(30).comment('Attribution window used (days)');
    table.integer('time_to_conversion_seconds').nullable().comment('Time from click to conversion');
    
    // Context data
    table.text('user_agent').nullable();
    table.specificType('ip_address', 'inet').nullable();
    table.text('referer').nullable();
    table.text('page_url').nullable();
    
    // Indexes
    table.index('timestamp');
    table.index('campaign_id');
    table.index('publisher_id');
    table.index('conversion_type');
    table.index(['timestamp', 'campaign_id']);
    table.index(['timestamp', 'publisher_id']);
    table.index(['impression_id', 'conversion_type']);
  });
  
  // Convert to TimescaleDB hypertable (if available)
  const timescaleCheck = await knex.raw(`
    SELECT EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) as exists;
  `).catch(() => ({ rows: [{ exists: false }] }));
  
  if (timescaleCheck.rows?.[0]?.exists) {
    try {
      await knex.raw(`
        SELECT create_hypertable('conversions', 'timestamp', if_not_exists => TRUE);
      `);
      console.log('✅ Created conversions hypertable with TimescaleDB');
    } catch (error: any) {
      console.log('Note: Created conversions as regular PostgreSQL table');
    }
  } else {
    console.log('Note: Created conversions as regular PostgreSQL table');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('conversions');
}

