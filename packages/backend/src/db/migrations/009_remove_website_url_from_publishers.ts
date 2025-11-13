/**
 * Migration: Remove website_url and domain_verified from publishers table
 * These fields are now in publisher_domains table
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove columns from publishers table
  await knex.schema.alterTable('publishers', (table) => {
    table.dropColumn('website_url');
    table.dropColumn('domain_verified');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Add columns back (for rollback)
  await knex.schema.alterTable('publishers', (table) => {
    table.string('website_url').nullable();
    table.boolean('domain_verified').defaultTo(false);
  });

  // Optionally migrate data back from publisher_domains
  // This would take the first approved domain or first domain
  const domains = await knex('publisher_domains')
    .select('publisher_id', 'website_url', 'domain_verified')
    .orderBy('created_at', 'asc');

  for (const domain of domains) {
    // Get first domain for each publisher
    const existing = await knex('publishers')
      .where('id', domain.publisher_id)
      .whereNull('website_url')
      .first();

    if (existing) {
      await knex('publishers')
        .where('id', domain.publisher_id)
        .update({
          website_url: domain.website_url,
          domain_verified: domain.domain_verified,
        });
    }
  }
}

