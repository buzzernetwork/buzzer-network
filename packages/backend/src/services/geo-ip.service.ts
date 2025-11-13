/**
 * GeoIP Service
 * IP geolocation using MaxMind GeoLite2-City database
 */

import maxmind from 'maxmind';
import { cache } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { Request } from 'express';

let geoipReader: any = null;

/**
 * Initialize MaxMind GeoIP database
 * Downloads and opens GeoLite2-City.mmdb
 */
export async function initGeoIP(): Promise<void> {
  // Try multiple possible locations for GeoIP database
  const possiblePaths = [
    './data/GeoLite2-City.mmdb',
    './data/GeoLite2-City_20251111/GeoLite2-City.mmdb',
    // Add more dated folders if needed
  ];

  for (const path of possiblePaths) {
    try {
      geoipReader = await maxmind.open(path);
      logger.info('✅ GeoIP database loaded successfully', { path });
      return;
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  // If no database found
  logger.warn('⚠️  GeoIP database not found. Geographic targeting will use client-provided data only.', {
    info: 'Download GeoLite2-City.mmdb from https://dev.maxmind.com/geoip/geolite2-free-geolocation-data',
    searchedPaths: possiblePaths,
  });
}

/**
 * Get geographic information from IP address
 * Returns cached results if available (24 hour TTL)
 */
export async function getGeoFromIP(ip: string): Promise<{
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}> {
  const cacheKey = `geo:${ip}`;
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // If GeoIP database not loaded, return nulls
  if (!geoipReader) {
    return { country: null, city: null, latitude: null, longitude: null };
  }
  
  try {
    const result = geoipReader.get(ip);
    const geoData = {
      country: result?.country?.iso_code || null,
      city: result?.city?.names?.en || null,
      latitude: result?.location?.latitude || null,
      longitude: result?.location?.longitude || null,
    };
    
    // Cache for 24 hours
    await cache.set(cacheKey, geoData, 86400);
    
    return geoData;
  } catch (error) {
    logger.error('GeoIP lookup failed', { ip, error });
    return { country: null, city: null, latitude: null, longitude: null };
  }
}

/**
 * Extract real client IP from request
 * Handles proxies (x-forwarded-for, x-real-ip) and direct connections
 */
export function extractClientIP(req: Request): string {
  // Try x-forwarded-for first (common in production behind proxies/CDN)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = typeof xForwardedFor === 'string' ? xForwardedFor.split(',') : xForwardedFor;
    return ips[0].trim();
  }
  
  // Try x-real-ip header
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }
  
  // Fall back to req.ip
  return req.ip || '127.0.0.1';
}

