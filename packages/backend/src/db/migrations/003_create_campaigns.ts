/**
 * Migration: Create campaigns table
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('campaigns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('advertiser_id').references('id').inTable('advertisers').onDelete('CASCADE');
    table.string('name').notNullable();
    table.enum('objective', ['awareness', 'clicks', 'conversions']).notNullable();
    table.enum('bid_model', ['CPM', 'CPC']).notNullable();
    table.decimal('bid_amount', 18, 8).notNullable();
    table.decimal('total_budget', 18, 8).notNullable();
    table.decimal('daily_budget', 18, 8).nullable();
    table.decimal('spent_budget', 18, 8).defaultTo('0');
    table.enum('status', ['draft', 'active', 'paused', 'ended']).defaultTo('draft');
    table.jsonb('targeting').notNullable(); // { geo, categories, quality_min, devices }
    table.string('creative_url').notNullable();
    table.enum('creative_format', ['banner', 'native', 'video']).notNullable();
    table.string('landing_page_url').notNullable();
    table.timestamp('start_date').nullable();
    table.timestamp('end_date').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('advertiser_id');
    table.index('status');
    table.index('bid_model');
    table.index(['status', 'bid_amount']); // For matching engine
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('campaigns');
}

