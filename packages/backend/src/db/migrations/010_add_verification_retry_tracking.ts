import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('publisher_domains', (table) => {
    table.timestamp('last_verification_attempt').nullable();
    table.integer('verification_attempts').defaultTo(0);
    table.timestamp('next_verification_at').nullable();
    table.text('verification_error').nullable();
    
    // Index for background worker to efficiently find domains needing verification
    table.index(['domain_verified', 'next_verification_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('publisher_domains', (table) => {
    table.dropIndex(['domain_verified', 'next_verification_at']);
    table.dropColumn('last_verification_attempt');
    table.dropColumn('verification_attempts');
    table.dropColumn('next_verification_at');
    table.dropColumn('verification_error');
  });
}

