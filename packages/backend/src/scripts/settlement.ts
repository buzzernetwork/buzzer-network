#!/usr/bin/env node
/**
 * Settlement Automation Script
 * Runs daily to calculate and process publisher payouts
 * 
 * Usage:
 *   npm run settlement        # Process today's settlement
 *   npm run settlement:date   # Process specific date
 */

import dotenv from 'dotenv';
import { processDailySettlement } from '../services/settlement.service.js';
import { testDatabaseConnection } from '../config/database.js';

dotenv.config();

async function main() {
  console.log('🚀 Starting Daily Settlement Process');
  console.log('='.repeat(60));

  // Check database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('❌ Database connection failed. Exiting.');
    process.exit(1);
  }

  // Get settlement date from command line argument or use today
  const args = process.argv.slice(2);
  let settlementDate = new Date();

  if (args.length > 0) {
    const dateArg = args[0];
    const parsedDate = new Date(dateArg);
    if (!isNaN(parsedDate.getTime())) {
      settlementDate = parsedDate;
      console.log(`📅 Processing settlement for date: ${settlementDate.toISOString().split('T')[0]}`);
    } else {
      console.error(`❌ Invalid date: ${dateArg}`);
      process.exit(1);
    }
  } else {
    console.log(`📅 Processing settlement for: ${settlementDate.toISOString().split('T')[0]}`);
  }

  try {
    const results = await processDailySettlement(settlementDate);

    console.log('\n📊 Settlement Summary:');
    console.log('='.repeat(60));
    console.log(`Total Publishers Processed: ${results.length}`);
    console.log(`Completed: ${results.filter(r => r.status === 'completed').length}`);
    console.log(`Pending: ${results.filter(r => r.status === 'pending').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);

    const totalEarnings = results
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.earnings), 0);

    console.log(`Total Payout: ${totalEarnings.toFixed(8)} ETH`);

    console.log('\n✅ Settlement process completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Settlement process failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };

