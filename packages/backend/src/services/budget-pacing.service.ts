/**
 * Budget Pacing Service
 * Distributes campaign spend evenly across 24 hours to prevent early exhaustion
 */

import { cache } from '../config/redis.js';

const HOURLY_BUFFER = 1.2; // Allow 20% overspend per hour

/**
 * Get the current hour of day (0-23)
 */
function getCurrentHour(): number {
  return new Date().getHours();
}

/**
 * Get Redis key for hourly pacing counter
 */
function getHourlyKey(campaignId: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const hour = now.getHours().toString().padStart(2, '0'); // HH
  return `pacing:${campaignId}:${dateStr}:${hour}`;
}

/**
 * Get hourly spend for a campaign
 * @param campaignId - Campaign UUID
 * @returns Current hourly spend
 */
export async function getHourlySpend(campaignId: string): Promise<number> {
  const key = getHourlyKey(campaignId);
  const spend = await cache.get<number>(key);
  return spend || 0;
}

/**
 * Increment hourly spend counter
 * @param campaignId - Campaign UUID
 * @param amount - Amount to increment
 */
export async function incrementHourlySpend(
  campaignId: string,
  amount: number
): Promise<void> {
  const key = getHourlyKey(campaignId);
  
  // Get current value
  const current = await getHourlySpend(campaignId);
  const newValue = current + amount;
  
  // Set with 2-hour TTL (covers current and next hour)
  await cache.set(key, newValue, 7200);
}

/**
 * Check if a campaign should be served based on pacing
 * @param campaignId - Campaign UUID
 * @param dailyBudget - Daily budget limit
 * @returns true if campaign can serve, false if throttled
 */
export async function shouldServeCampaign(
  campaignId: string,
  dailyBudget: number
): Promise<boolean> {
  // Calculate target hourly budget (even distribution)
  const targetHourlyBudget = dailyBudget / 24;
  
  // Get current hourly spend
  const hourlySpend = await getHourlySpend(campaignId);
  
  // Allow some buffer (20%) to handle traffic spikes
  const hourlyLimit = targetHourlyBudget * HOURLY_BUFFER;
  
  // Check if we've exceeded the hourly limit
  return hourlySpend < hourlyLimit;
}

/**
 * Check if campaign should be served with probabilistic throttling
 * As we approach the hourly limit, reduce serving probability
 * @param campaignId - Campaign UUID
 * @param dailyBudget - Daily budget limit
 * @returns true if campaign should serve (probabilistic)
 */
export async function shouldServeCampaignProbabilistic(
  campaignId: string,
  dailyBudget: number
): Promise<boolean> {
  const targetHourlyBudget = dailyBudget / 24;
  const hourlySpend = await getHourlySpend(campaignId);
  const hourlyLimit = targetHourlyBudget * HOURLY_BUFFER;
  
  // If we're under 80% of limit, always serve
  if (hourlySpend < hourlyLimit * 0.8) {
    return true;
  }
  
  // If we're over limit, never serve
  if (hourlySpend >= hourlyLimit) {
    return false;
  }
  
  // Between 80% and 100%, throttle probabilistically
  // As we approach the limit, reduce probability
  const utilizationRatio = hourlySpend / hourlyLimit;
  const throttleRatio = (1 - utilizationRatio) / 0.2; // Linear decline from 1 to 0
  
  // Random check with declining probability
  return Math.random() < throttleRatio;
}

/**
 * Get pacing statistics for a campaign
 * @param campaignId - Campaign UUID
 * @param dailyBudget - Daily budget limit
 */
export async function getPacingStats(
  campaignId: string,
  dailyBudget: number
): Promise<{
  hourlySpend: number;
  hourlyTarget: number;
  hourlyLimit: number;
  utilizationPercent: number;
  shouldThrottle: boolean;
}> {
  const targetHourlyBudget = dailyBudget / 24;
  const hourlySpend = await getHourlySpend(campaignId);
  const hourlyLimit = targetHourlyBudget * HOURLY_BUFFER;
  const utilizationPercent = (hourlySpend / hourlyLimit) * 100;
  
  return {
    hourlySpend,
    hourlyTarget: targetHourlyBudget,
    hourlyLimit,
    utilizationPercent,
    shouldThrottle: hourlySpend >= hourlyLimit,
  };
}

