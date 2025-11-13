/**
 * Migration: Add ad requests tracking for fill rate calculation
 * Tracks every ad request to accurately calculate fill rate
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create ad_requests table for fill rate tracking
  await knex.schema.createTable('ad_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('publisher_id').notNullable();
    table.text('slot_id').notNullable();
    table.enum('format', ['banner', 'native', 'video']).notNullable();
    table.string('geo', 2).nullable(); // Country code
    table.string('device', 20).nullable(); // desktop/mobile/tablet
    table.boolean('filled').defaultTo(false); // Whether an ad was served
    table.uuid('campaign_id').nullable(); // Campaign that filled the request (if any)
    table.string('reason').nullable(); // Reason for no fill (e.g., 'no_match', 'budget_exceeded', 'freq_cap')
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    // Indexes for analytics and reporting
    table.index('publisher_id');
    table.index('slot_id');
    table.index(['timestamp', 'filled']);
    table.index(['slot_id', 'timestamp']);
    table.index(['publisher_id', 'timestamp']);
  });
  
  console.log('✓ Created ad_requests table for fill rate tracking');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ad_requests');
}

