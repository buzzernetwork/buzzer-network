/**
 * Migration: Add Publisher Categories
 * Support for content categorization and targeting
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('publishers', (table) => {
    // Add categories as JSONB array (IAB taxonomy)
    table.jsonb('categories').defaultTo('[]');
  });
  
  // Add GIN index for efficient array intersection queries
  await knex.raw(`
    CREATE INDEX idx_publishers_categories 
    ON publishers USING GIN (categories)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS idx_publishers_categories');
  
  await knex.schema.alterTable('publishers', (table) => {
    table.dropColumn('categories');
  });
}

