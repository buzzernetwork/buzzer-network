/**
 * Blocklist Service
 * Brand safety enforcement for advertisers and publishers
 */

import { dbPool } from '../config/database.js';
import { cache } from '../config/redis.js';

/**
 * Check if a publisher is blocked by an advertiser
 * @param advertiserId - Advertiser UUID
 * @param publisherId - Publisher UUID
 * @returns true if blocked, false if allowed
 */
export async function isPublisherBlockedByAdvertiser(
  advertiserId: string,
  publisherId: string
): Promise<boolean> {
  const cacheKey = `blocklist:adv:${advertiserId}:pub:${publisherId}`;
  const cached = await cache.get<boolean>(cacheKey);
  
  if (cached !== null) {
    return cached;
  }
  
  try {
    // Check advertiser blocklist for this specific publisher
    const result = await dbPool.query(
      `SELECT 1 FROM advertiser_blocklists 
       WHERE advertiser_id = $1 
       AND blocked_publisher_id = $2
       LIMIT 1`,
      [advertiserId, publisherId]
    );
    
    const isBlocked = result.rows.length > 0;
    
    // Cache result for 60 minutes
    await cache.set(cacheKey, isBlocked, 3600);
    
    return isBlocked;
  } catch (error) {
    console.error('Blocklist check error:', error);
    // Fail open: don't block on errors
    return false;
  }
}

/**
 * Check if an advertiser is blocked by a publisher
 * @param publisherId - Publisher UUID
 * @param advertiserId - Advertiser UUID
 * @returns true if blocked, false if allowed
 */
export async function isAdvertiserBlockedByPublisher(
  publisherId: string,
  advertiserId: string
): Promise<boolean> {
  const cacheKey = `blocklist:pub:${publisherId}:adv:${advertiserId}`;
  const cached = await cache.get<boolean>(cacheKey);
  
  if (cached !== null) {
    return cached;
  }
  
  try {
    // Check publisher blocklist for this specific advertiser
    const result = await dbPool.query(
      `SELECT 1 FROM publisher_blocklists 
       WHERE publisher_id = $1 
       AND blocked_advertiser_id = $2
       LIMIT 1`,
      [publisherId, advertiserId]
    );
    
    const isBlocked = result.rows.length > 0;
    
    // Cache result for 60 minutes
    await cache.set(cacheKey, isBlocked, 3600);
    
    return isBlocked;
  } catch (error) {
    console.error('Blocklist check error:', error);
    // Fail open: don't block on errors
    return false;
  }
}

/**
 * Check if a campaign can serve on a publisher (bidirectional check)
 * @param advertiserId - Advertiser UUID
 * @param publisherId - Publisher UUID
 * @returns true if blocked (either direction), false if allowed
 */
export async function isBlocked(
  advertiserId: string,
  publisherId: string
): Promise<boolean> {
  // Check both directions
  const [advBlocked, pubBlocked] = await Promise.all([
    isPublisherBlockedByAdvertiser(advertiserId, publisherId),
    isAdvertiserBlockedByPublisher(publisherId, advertiserId),
  ]);
  
  return advBlocked || pubBlocked;
}

/**
 * Invalidate blocklist cache for a specific advertiser-publisher pair
 */
export async function invalidateBlocklistCache(
  advertiserId: string,
  publisherId: string
): Promise<void> {
  await Promise.all([
    cache.del(`blocklist:adv:${advertiserId}:pub:${publisherId}`),
    cache.del(`blocklist:pub:${publisherId}:adv:${advertiserId}`),
  ]);
}

