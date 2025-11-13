/**
 * Migration: Add campaign creative dimensions
 * Support multi-size matching for ad slots
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    // Store actual creative dimensions (e.g., "300x250")
    table.text('creative_dimensions').nullable();
    
    // Index for efficient matching
    table.index('creative_dimensions');
  });
  
  // Set default creative_dimensions based on creative_format
  await knex.raw(`
    UPDATE campaigns 
    SET creative_dimensions = CASE 
      WHEN creative_format = 'banner' THEN '300x250'
      WHEN creative_format = 'native' THEN '300x250'
      WHEN creative_format = 'video' THEN '640x360'
      ELSE '300x250'
    END
    WHERE creative_dimensions IS NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('creative_dimensions');
  });
}

