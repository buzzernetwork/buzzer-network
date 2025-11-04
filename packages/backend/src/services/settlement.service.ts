/**
 * Settlement Service
 * Handles daily settlement calculations and publisher payouts
 */

import { dbPool } from '../config/database.js';
import { executeBatchPayouts } from './contract.service.js';

export interface SettlementResult {
  publisherId: string;
  publisherAddress: string;
  impressions: number;
  clicks: number;
  earnings: string; // In ETH
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

/**
 * Calculate earnings for a publisher for a specific date range
 */
export async function calculatePublisherEarnings(
  publisherId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  impressions: number;
  clicks: number;
  totalEarnings: string;
}> {
  // Calculate from impressions (CPM)
  const impressionsResult = await dbPool.query(
    `SELECT 
      COUNT(*) as count,
      COALESCE(SUM(revenue), 0) as total_revenue
     FROM impressions
     WHERE publisher_id = $1
       AND timestamp >= $2
       AND timestamp < $3
       AND verified = true`,
    [publisherId, startDate, endDate]
  );

  // Calculate from clicks (CPC)
  const clicksResult = await dbPool.query(
    `SELECT 
      COUNT(*) as count,
      COALESCE(SUM(revenue), 0) as total_revenue
     FROM clicks
     WHERE publisher_id = $1
       AND timestamp >= $2
       AND timestamp < $3
       AND verified = true`,
    [publisherId, startDate, endDate]
  );

  const impressions = parseInt(impressionsResult.rows[0].count || '0');
  const clicks = parseInt(clicksResult.rows[0].count || '0');
  const impressionsRevenue = parseFloat(impressionsResult.rows[0].total_revenue || '0');
  const clicksRevenue = parseFloat(clicksResult.rows[0].total_revenue || '0');
  const totalEarnings = (impressionsRevenue + clicksRevenue).toString();

  // Apply 85% revenue share (15% network fee)
  const publisherEarnings = (parseFloat(totalEarnings) * 0.85).toFixed(8);

  return {
    impressions,
    clicks,
    totalEarnings: publisherEarnings,
  };
}

/**
 * Create settlement record for a publisher
 */
export async function createSettlement(
  publisherId: string,
  settlementDate: Date,
  earnings: {
    impressions: number;
    clicks: number;
    totalEarnings: string;
  },
  tokenType: string = 'ETH'
): Promise<string> {
  const result = await dbPool.query(
    `INSERT INTO settlements 
     (publisher_id, settlement_date, impressions_count, clicks_count, 
      earnings_amount, token_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [
      publisherId,
      settlementDate,
      earnings.impressions,
      earnings.clicks,
      earnings.totalEarnings,
      tokenType,
    ]
  );

  return result.rows[0].id;
}

/**
 * Process daily settlement for all publishers
 */
export async function processDailySettlement(
  settlementDate: Date = new Date()
): Promise<SettlementResult[]> {
  const results: SettlementResult[] = [];

  try {
    // Get all approved publishers
    const publishers = await dbPool.query(
      `SELECT id, payment_wallet, wallet_address 
       FROM publishers 
       WHERE status = 'approved' AND domain_verified = true`
    );

    // Calculate settlement period (previous day)
    const startDate = new Date(settlementDate);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    console.log(`Processing settlement for ${publishers.rows.length} publishers`);
    console.log(`Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Process each publisher
    for (const publisher of publishers.rows) {
      try {
        const earnings = await calculatePublisherEarnings(
          publisher.id,
          startDate,
          endDate
        );

        // Skip if no earnings
        if (parseFloat(earnings.totalEarnings) === 0) {
          console.log(`Skipping publisher ${publisher.id} - no earnings`);
          continue;
        }

        // Check minimum payout threshold (0.01 ETH)
        const minPayout = 0.01;
        if (parseFloat(earnings.totalEarnings) < minPayout) {
          console.log(`Skipping publisher ${publisher.id} - below minimum payout (${earnings.totalEarnings} < ${minPayout})`);
          // Create settlement record but mark as pending (accumulate)
          await createSettlement(publisher.id, settlementDate, earnings);
          continue;
        }

        // Create settlement record
        const settlementId = await createSettlement(publisher.id, settlementDate, earnings);

        results.push({
          publisherId: publisher.id,
          publisherAddress: publisher.payment_wallet || publisher.wallet_address,
          impressions: earnings.impressions,
          clicks: earnings.clicks,
          earnings: earnings.totalEarnings,
          status: 'pending',
        });

        console.log(`Created settlement for publisher ${publisher.id}: ${earnings.totalEarnings} ETH`);
      } catch (error) {
        console.error(`Error processing settlement for publisher ${publisher.id}:`, error);
        results.push({
          publisherId: publisher.id,
          publisherAddress: publisher.payment_wallet || publisher.wallet_address,
          impressions: 0,
          clicks: 0,
          earnings: '0',
          status: 'failed',
        });
      }
    }

    // Execute batch payouts if there are results
    if (results.length > 0 && results.some(r => r.status === 'pending')) {
      try {
        const payouts = results
          .filter(r => r.status === 'pending' && parseFloat(r.earnings) > 0)
          .map(r => ({
            publisher: r.publisherAddress,
            amount: r.earnings,
            token: 'ETH', // Default to ETH, can be extended
          }));

        if (payouts.length > 0) {
          console.log(`Executing batch payout for ${payouts.length} publishers`);
          const txHash = await executeBatchPayouts(payouts);

          // Update settlement records with transaction hash
          for (const result of results.filter(r => r.status === 'pending')) {
            await dbPool.query(
              `UPDATE settlements 
               SET tx_hash = $1, status = 'completed', paid_at = NOW()
               WHERE publisher_id = $2 AND settlement_date = $3`,
              [txHash, result.publisherId, settlementDate]
            );

            result.txHash = txHash;
            result.status = 'completed';
          }

          console.log(`Batch payout completed: ${txHash}`);
        }
      } catch (error) {
        console.error('Batch payout error:', error);
        // Mark settlements as failed
        for (const result of results) {
          if (result.status === 'pending') {
            await dbPool.query(
              `UPDATE settlements SET status = 'failed'
               WHERE publisher_id = $1 AND settlement_date = $2`,
              [result.publisherId, settlementDate]
            );
            result.status = 'failed';
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Daily settlement error:', error);
    throw error;
  }
}

/**
 * Get settlement history for a publisher
 */
export async function getSettlementHistory(
  publisherId: string,
  limit: number = 30
): Promise<any[]> {
  const result = await dbPool.query(
    `SELECT 
      id, settlement_date, impressions_count, clicks_count,
      earnings_amount, token_type, status, tx_hash, paid_at
     FROM settlements
     WHERE publisher_id = $1
     ORDER BY settlement_date DESC
     LIMIT $2`,
    [publisherId, limit]
  );

  return result.rows;
}

