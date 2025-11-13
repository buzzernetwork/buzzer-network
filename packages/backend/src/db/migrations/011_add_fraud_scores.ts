/**
 * Migration: Add fraud scoring to impressions and clicks
 * Adds fraud detection fields for quality scoring
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add fraud scoring columns to impressions table
  await knex.schema.table('impressions', (table) => {
    table.decimal('fraud_score', 3, 2).nullable().comment('Pixalate fraud probability 0.0-1.0');
    table.enum('fraud_status', ['clean', 'suspicious', 'fraud']).defaultTo('clean');
    table.index('fraud_score');
    table.index('fraud_status');
  });

  // Add fraud scoring columns to clicks table
  await knex.schema.table('clicks', (table) => {
    table.decimal('fraud_score', 3, 2).nullable().comment('Pixalate fraud probability 0.0-1.0');
    table.enum('fraud_status', ['clean', 'suspicious', 'fraud']).defaultTo('clean');
    table.index('fraud_score');
    table.index('fraud_status');
  });

  console.log('✅ Added fraud scoring columns to impressions and clicks tables');
}

export async function down(knex: Knex): Promise<void> {
  // Remove fraud scoring columns from clicks table
  await knex.schema.table('clicks', (table) => {
    table.dropIndex('fraud_status');
    table.dropIndex('fraud_score');
    table.dropColumn('fraud_status');
    table.dropColumn('fraud_score');
  });

  // Remove fraud scoring columns from impressions table
  await knex.schema.table('impressions', (table) => {
    table.dropIndex('fraud_status');
    table.dropIndex('fraud_score');
    table.dropColumn('fraud_status');
    table.dropColumn('fraud_score');
  });

  console.log('✅ Removed fraud scoring columns from impressions and clicks tables');
}

