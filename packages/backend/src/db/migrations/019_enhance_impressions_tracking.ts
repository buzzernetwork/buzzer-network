/**
 * Migration: Enhance impressions and clicks tracking with industry-standard fields
 * Adds context data fields required by IAB/MRC standards for accurate measurement
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enhance impressions table with IAB standard fields
  await knex.schema.alterTable('impressions', (table) => {
    table.text('user_agent').nullable().comment('Browser/device user agent string');
    table.specificType('ip_address', 'inet').nullable().comment('Client IP address for geo/fraud detection');
    table.text('referer').nullable().comment('HTTP referer header');
    table.text('page_url').nullable().comment('Publisher page URL where ad was displayed');
    table.text('session_id').nullable().comment('User session identifier');
    table.text('cache_buster').nullable().comment('Cache-busting token for tracking pixel');
    
    // Add indexes for common queries
    table.index('session_id');
    table.index('ip_address');
  });
  
  // Enhance clicks table with the same fields
  await knex.schema.alterTable('clicks', (table) => {
    table.text('user_agent').nullable().comment('Browser/device user agent string');
    table.specificType('ip_address', 'inet').nullable().comment('Client IP address for geo/fraud detection');
    table.text('referer').nullable().comment('HTTP referer header');
    table.text('page_url').nullable().comment('Publisher page URL where ad was displayed');
    table.text('session_id').nullable().comment('User session identifier');
    table.text('cache_buster').nullable().comment('Cache-busting token for tracking pixel');
    
    // Add indexes for common queries
    table.index('session_id');
    table.index('ip_address');
  });
  
  console.log('✓ Enhanced impressions and clicks tables with IAB standard context fields');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('impressions', (table) => {
    table.dropColumn('user_agent');
    table.dropColumn('ip_address');
    table.dropColumn('referer');
    table.dropColumn('page_url');
    table.dropColumn('session_id');
    table.dropColumn('cache_buster');
  });
  
  await knex.schema.alterTable('clicks', (table) => {
    table.dropColumn('user_agent');
    table.dropColumn('ip_address');
    table.dropColumn('referer');
    table.dropColumn('page_url');
    table.dropColumn('session_id');
    table.dropColumn('cache_buster');
  });
}

