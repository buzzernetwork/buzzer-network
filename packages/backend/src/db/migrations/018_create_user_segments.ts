/**
 * Migration: Create User Segments
 * Support for behavioral targeting and retargeting
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // User segments table (privacy-preserving)
  await knex.schema.createTable('user_segments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('hashed_user_id', 64).notNullable(); // SHA256 hash
    table.string('segment_id').notNullable(); // e.g., 'tech_interested', 'retarget_campaign_123'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // Auto-expire for privacy
    
    // Indexes
    table.index('hashed_user_id');
    table.index('segment_id');
    table.index('expires_at'); // For cleanup queries
    table.unique(['hashed_user_id', 'segment_id']);
  });
  
  // Campaign target segments (which segments campaigns want to target)
  await knex.schema.createTable('campaign_target_segments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('campaign_id').references('id').inTable('campaigns').onDelete('CASCADE');
    table.string('segment_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('campaign_id');
    table.index('segment_id');
    table.unique(['campaign_id', 'segment_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('campaign_target_segments');
  await knex.schema.dropTableIfExists('user_segments');
}

