/**
 * Migration: Add viewability-based billing option to campaigns
 * Allows campaigns to opt-in to only paying for viewable impressions (MRC standard)
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add viewability billing columns to campaigns table
  await knex.schema.alterTable('campaigns', (table) => {
    table.boolean('require_viewability').defaultTo(false).comment('Only bill for viewable impressions (MRC 50%/1sec)');
    table.decimal('viewability_premium', 5, 4).nullable().comment('Optional CPM premium for viewability requirement (e.g., 1.2 = 20% premium)');
  });
  
  // Add viewability tracking to impressions for billing
  await knex.schema.alterTable('impressions', (table) => {
    table.boolean('viewable').nullable().comment('Whether impression met viewability threshold (updated post-impression)');
    table.boolean('billed').defaultTo(false).comment('Whether this impression was billed (used for viewability-based billing)');
  });
  
  console.log('✓ Added viewability-based billing columns to campaigns and impressions');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('require_viewability');
    table.dropColumn('viewability_premium');
  });
  
  await knex.schema.alterTable('impressions', (table) => {
    table.dropColumn('viewable');
    table.dropColumn('billed');
  });
}

