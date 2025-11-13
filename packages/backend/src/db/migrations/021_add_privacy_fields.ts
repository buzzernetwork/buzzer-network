/**
 * Migration: Add privacy and consent fields to tracking tables
 * Supports GDPR/CCPA compliance with consent tracking and privacy modes
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add privacy fields to impressions table
  await knex.schema.table('impressions', (table) => {
    table.boolean('consent_given').defaultTo(false).comment('User gave tracking consent');
    table.enum('privacy_mode', ['standard', 'privacy-enhanced', 'minimal'])
      .defaultTo('standard')
      .comment('Privacy mode: standard, privacy-enhanced, or minimal');
    table.index('consent_given');
    table.index('privacy_mode');
  });
  
  // Add privacy fields to clicks table
  await knex.schema.table('clicks', (table) => {
    table.boolean('consent_given').defaultTo(false).comment('User gave tracking consent');
    table.enum('privacy_mode', ['standard', 'privacy-enhanced', 'minimal'])
      .defaultTo('standard')
      .comment('Privacy mode: standard, privacy-enhanced, or minimal');
    table.index('consent_given');
    table.index('privacy_mode');
  });
  
  // Add privacy fields to conversions table (if it exists)
  const hasConversions = await knex.schema.hasTable('conversions');
  if (hasConversions) {
    await knex.schema.table('conversions', (table) => {
      table.boolean('consent_given').defaultTo(false).comment('User gave tracking consent');
      table.enum('privacy_mode', ['standard', 'privacy-enhanced', 'minimal'])
        .defaultTo('standard')
        .comment('Privacy mode: standard, privacy-enhanced, or minimal');
    });
  }
  
  // Create privacy opt-out table for GDPR/CCPA compliance
  await knex.schema.createTable('privacy_opt_outs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('identifier', 255).notNullable().unique().comment('Hashed user identifier');
    table.timestamp('opted_out_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('expires_at').nullable().comment('Optional expiration for temporary opt-outs');
    table.string('source', 50).defaultTo('user_request').comment('Source: user_request, gdpr, ccpa');
    table.jsonb('metadata').nullable().comment('Additional opt-out metadata');
    
    table.index('identifier');
    table.index('opted_out_at');
  });
  
  console.log('✅ Added privacy and consent fields to tracking tables');
}

export async function down(knex: Knex): Promise<void> {
  // Remove privacy opt-out table
  await knex.schema.dropTableIfExists('privacy_opt_outs');
  
  // Remove privacy fields from conversions table
  const hasConversions = await knex.schema.hasTable('conversions');
  if (hasConversions) {
    await knex.schema.table('conversions', (table) => {
      table.dropColumn('privacy_mode');
      table.dropColumn('consent_given');
    });
  }
  
  // Remove privacy fields from clicks table
  await knex.schema.table('clicks', (table) => {
    table.dropIndex('privacy_mode');
    table.dropIndex('consent_given');
    table.dropColumn('privacy_mode');
    table.dropColumn('consent_given');
  });
  
  // Remove privacy fields from impressions table
  await knex.schema.table('impressions', (table) => {
    table.dropIndex('privacy_mode');
    table.dropIndex('consent_given');
    table.dropColumn('privacy_mode');
    table.dropColumn('consent_given');
  });
  
  console.log('✅ Removed privacy and consent fields from tracking tables');
}

