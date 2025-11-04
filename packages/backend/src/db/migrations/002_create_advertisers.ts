/**
 * Migration: Create advertisers table
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('advertisers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('wallet_address', 42).unique().notNullable();
    table.string('company_name').notNullable();
    table.string('website_url').nullable();
    table.enum('status', ['active', 'suspended']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('wallet_address');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('advertisers');
}

