/**
 * Migration: Create settlements table
 * Tracks publisher payouts and settlement history
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settlements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('publisher_id').references('id').inTable('publishers').onDelete('CASCADE');
    table.date('settlement_date').notNullable();
    table.integer('impressions_count').defaultTo(0);
    table.integer('clicks_count').defaultTo(0);
    table.decimal('earnings_amount', 18, 8).notNullable();
    table.string('token_type', 10).notNullable(); // ETH, USDC, BUZZ
    table.string('tx_hash', 66).nullable(); // Blockchain transaction hash
    table.enum('status', ['pending', 'completed', 'failed']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('paid_at').nullable();
    
    // Indexes
    table.index('publisher_id');
    table.index('settlement_date');
    table.index('status');
    table.index(['publisher_id', 'settlement_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('settlements');
}




