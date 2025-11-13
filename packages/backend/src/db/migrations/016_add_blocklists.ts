/**
 * Migration: Add Blocklist Tables
 * Brand safety and content categorization
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Advertiser blocklists (advertisers can block specific publishers/domains/categories)
  await knex.schema.createTable('advertiser_blocklists', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('advertiser_id').references('id').inTable('advertisers').onDelete('CASCADE');
    table.uuid('blocked_publisher_id').references('id').inTable('publishers').onDelete('CASCADE').nullable();
    table.text('blocked_domain').nullable();
    table.text('blocked_category').nullable();
    table.text('reason').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('advertiser_id');
    table.index('blocked_publisher_id');
    table.index('blocked_domain');
    table.index('blocked_category');
  });

  // Publisher blocklists (publishers can block specific advertisers/brands/categories)
  await knex.schema.createTable('publisher_blocklists', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('publisher_id').references('id').inTable('publishers').onDelete('CASCADE');
    table.uuid('blocked_advertiser_id').references('id').inTable('advertisers').onDelete('CASCADE').nullable();
    table.text('blocked_brand').nullable();
    table.text('blocked_category').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('publisher_id');
    table.index('blocked_advertiser_id');
    table.index('blocked_brand');
    table.index('blocked_category');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('advertiser_blocklists');
  await knex.schema.dropTableIfExists('publisher_blocklists');
}

