/**
 * Migration: Create ad_slots table
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ad_slots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('publisher_id').references('id').inTable('publishers').onDelete('CASCADE');
    table.string('slot_id', 50).unique().notNullable();
    table.enum('format', ['banner', 'native', 'video']).notNullable();
    table.string('dimensions', 20).nullable(); // e.g., "300x250"
    table.enum('status', ['active', 'paused']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('publisher_id');
    table.index('slot_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ad_slots');
}




