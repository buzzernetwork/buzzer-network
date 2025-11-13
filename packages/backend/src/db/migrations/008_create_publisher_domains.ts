/**
 * Migration: Create publisher_domains table
 * Supports multiple domains per publisher account
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('publisher_domains', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('publisher_id').references('id').inTable('publishers').onDelete('CASCADE');
    table.string('website_url').notNullable();
    table.boolean('domain_verified').defaultTo(false);
    table.string('verification_token', 100).nullable();
    table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('publisher_id');
    table.index('website_url');
    // Unique constraint: one publisher can't have duplicate domains
    table.unique(['publisher_id', 'website_url']);
  });

  // Migrate existing data from publishers table
  const existingPublishers = await knex('publishers')
    .select('id', 'website_url', 'domain_verified', 'status')
    .whereNotNull('website_url');

  for (const publisher of existingPublishers) {
    await knex('publisher_domains').insert({
      publisher_id: publisher.id,
      website_url: publisher.website_url,
      domain_verified: publisher.domain_verified || false,
      status: publisher.domain_verified ? 'approved' : 'pending',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Before dropping, we could migrate data back, but for safety, we'll just drop
  await knex.schema.dropTableIfExists('publisher_domains');
}

