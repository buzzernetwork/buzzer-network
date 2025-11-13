/**
 * Pixalate Service
 * Wrapper for Pixalate Ad Fraud API with caching and rate limiting
 */

import { cache } from '../config/redis.js';

const PIXALATE_API_KEY = process.env.PIXALATE_API_KEY || '';
const PIXALATE_API_URL = 'https://fraud-api.pixalate.com/api/v2/fraud';
const CACHE_TTL = 2 * 60 * 60; // 2 hours in seconds
const DAILY_QUOTA = 1000; // Pixalate free tier limit
const QUOTA_RESET_TTL = 24 * 60 * 60; // 24 hours in seconds

/**
 * Get current API usage for the day
 */
async function getAPIUsage(): Promise<number> {
  const usage = await cache.get<number>('pixalate:daily_usage');
  return usage || 0;
}

/**
 * Increment API usage counter
 */
async function incrementAPIUsage(): Promise<number> {
  const key = 'pixalate:daily_usage';
  const current = await getAPIUsage();
  const newCount = current + 1;
  
  // Set with TTL if first call of the day
  if (current === 0) {
    await cache.set(key, newCount, QUOTA_RESET_TTL);
  } else {
    await cache.set(key, newCount);
  }
  
  return newCount;
}

/**
 * Check if we have remaining API quota
 */
async function hasQuota(): Promise<boolean> {
  const usage = await getAPIUsage();
  return usage < DAILY_QUOTA;
}

/**
 * Get remaining API quota
 */
export async function getRemainingQuota(): Promise<number> {
  const usage = await getAPIUsage();
  return Math.max(0, DAILY_QUOTA - usage);
}

/**
 * Check IP address for fraud probability using Pixalate API
 * Returns fraud probability 0.0-1.0 (0.0 = clean, 1.0 = definite fraud)
 * 
 * Features:
 * - Redis caching (2 hour TTL)
 * - Rate limiting (1000 calls/day)
 * - Error handling with fallback
 * 
 * @param ip - IP address to check
 * @returns Fraud probability between 0.0 and 1.0
 */
export async function checkIPFraud(ip: string): Promise<number> {
  if (!ip || ip === '::1' || ip === '127.0.0.1') {
    // Localhost IPs - assume clean for development
    return 0.0;
  }

  // Check cache first
  const cacheKey = `pixalate:fraud:${ip}`;
  const cached = await cache.get<number>(cacheKey);
  
  if (cached !== null && cached !== undefined) {
    console.log(`[Pixalate] Cache hit for IP ${ip}: ${cached}`);
    return cached;
  }

  // Check quota
  if (!await hasQuota()) {
    console.warn(`[Pixalate] Daily quota exhausted. Using fallback score 0.5 for IP ${ip}`);
    return 0.5; // Neutral score when quota exhausted
  }

  // API key check
  if (!PIXALATE_API_KEY) {
    console.error('[Pixalate] API key not configured. Using fallback score 0.5');
    return 0.5;
  }

  try {
    console.log(`[Pixalate] Checking IP ${ip} via API...`);
    
    const url = `${PIXALATE_API_URL}?ip=${encodeURIComponent(ip)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': PIXALATE_API_KEY,
      },
    });

    await incrementAPIUsage();
    const remaining = await getRemainingQuota();
    console.log(`[Pixalate] API calls remaining today: ${remaining}/${DAILY_QUOTA}`);

    if (!response.ok) {
      console.error(`[Pixalate] API error: ${response.status} ${response.statusText}`);
      return 0.5; // Fallback to neutral on error
    }

    const data = await response.json();
    const probability = typeof data.probability === 'number' ? data.probability : 0.5;
    
    // Validate probability range
    const fraudScore = Math.max(0.0, Math.min(1.0, probability));
    
    // Cache the result
    await cache.set(cacheKey, fraudScore, CACHE_TTL);
    
    console.log(`[Pixalate] IP ${ip} fraud probability: ${fraudScore}`);
    return fraudScore;

  } catch (error) {
    console.error('[Pixalate] API request failed:', error);
    // Return neutral score on error to avoid blocking traffic
    return 0.5;
  }
}

/**
 * Determine fraud status based on probability score
 * @param fraudScore - Fraud probability (0.0-1.0)
 * @returns Fraud status: 'clean', 'suspicious', or 'fraud'
 */
export function getFraudStatus(fraudScore: number): 'clean' | 'suspicious' | 'fraud' {
  if (fraudScore < 0.5) {
    return 'clean';
  } else if (fraudScore < 0.7) {
    return 'suspicious';
  } else {
    return 'fraud';
  }
}

/**
 * Determine if traffic should be blocked entirely (fraud score >= 0.9)
 * @param fraudScore - Fraud probability (0.0-1.0)
 * @returns True if traffic should be blocked
 */
export function shouldBlockTraffic(fraudScore: number): boolean {
  return fraudScore >= 0.9;
}

/**
 * Determine if revenue should be counted for this traffic
 * @param fraudScore - Fraud probability (0.0-1.0)
 * @returns True if revenue should be counted
 */
export function shouldCountRevenue(fraudScore: number): boolean {
  return fraudScore < 0.7;
}

/**
 * Get API usage statistics
 * @returns Current usage and quota information
 */
export async function getAPIStats(): Promise<{
  usage: number;
  quota: number;
  remaining: number;
  percentage: number;
}> {
  const usage = await getAPIUsage();
  const remaining = Math.max(0, DAILY_QUOTA - usage);
  const percentage = (usage / DAILY_QUOTA) * 100;

  return {
    usage,
    quota: DAILY_QUOTA,
    remaining,
    percentage: Math.round(percentage * 100) / 100,
  };
}

