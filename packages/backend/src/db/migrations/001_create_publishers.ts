/**
 * Migration: Create publishers table
 * Creates the publishers table for storing publisher information
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('publishers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('wallet_address', 42).unique().notNullable();
    table.string('email').nullable();
    table.string('website_url').notNullable();
    table.boolean('domain_verified').defaultTo(false);
    table.integer('quality_score').nullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'suspended']).defaultTo('pending');
    table.string('payment_wallet', 42).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('wallet_address');
    table.index('status');
    table.index('quality_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('publishers');
}




