/**
 * Migration: Enhance ad_slots table
 * Add industry-standard features for ad slot management
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ad_slots', (table) => {
    // Display and organization
    table.text('name').nullable(); // Publisher display name
    table.text('path').nullable(); // Hierarchical organization (e.g., "homepage/header")
    
    // Multi-size support (IAB standards)
    table.jsonb('sizes').nullable(); // Array of dimensions: ["300x250", "336x280"]
    table.text('primary_size').nullable(); // Most common size for space reservation
    
    // Placement
    table.enum('position', ['above_fold', 'below_fold', 'sidebar', 'footer']).nullable();
    
    // Ad refresh settings
    table.boolean('refresh_enabled').defaultTo(false);
    table.integer('refresh_interval').defaultTo(30); // Seconds between refreshes
    
    // Performance settings
    table.boolean('lazy_load').defaultTo(false);
    table.decimal('viewability_threshold', 3, 2).defaultTo(0.50); // 50% threshold
    
    // Revenue optimization
    table.decimal('floor_price', 10, 4).nullable(); // Minimum CPM bid
    
    // Indexes for performance
    table.index('name');
    table.index('position');
    table.index('floor_price');
  });
  
  // Update status enum to include 'archived'
  await knex.raw(`
    ALTER TABLE ad_slots 
    DROP CONSTRAINT IF EXISTS ad_slots_status_check;
  `);
  
  await knex.raw(`
    ALTER TABLE ad_slots 
    ADD CONSTRAINT ad_slots_status_check 
    CHECK (status IN ('active', 'paused', 'archived'));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ad_slots', (table) => {
    table.dropColumn('name');
    table.dropColumn('path');
    table.dropColumn('sizes');
    table.dropColumn('primary_size');
    table.dropColumn('position');
    table.dropColumn('refresh_enabled');
    table.dropColumn('refresh_interval');
    table.dropColumn('lazy_load');
    table.dropColumn('viewability_threshold');
    table.dropColumn('floor_price');
  });
  
  // Restore original status enum
  await knex.raw(`
    ALTER TABLE ad_slots 
    DROP CONSTRAINT IF EXISTS ad_slots_status_check;
  `);
  
  await knex.raw(`
    ALTER TABLE ad_slots 
    ADD CONSTRAINT ad_slots_status_check 
    CHECK (status IN ('active', 'paused'));
  `);
}

