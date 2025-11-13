/**
 * Consent Middleware
 * GDPR/CCPA compliance middleware for tracking consent
 */

import { Request, Response, NextFunction } from 'express';
import { cache } from '../config/redis.js';
import crypto from 'crypto';
import { trackingConfig } from '../config/tracking-config.js';
import { logger } from '../config/logger.js';

const consentLogger = logger.child({ component: 'consent' });

export interface ConsentInfo {
  hasConsent: boolean;
  privacyMode: 'standard' | 'privacy-enhanced' | 'minimal';
  userIdentifier?: string;
  isOptedOut: boolean;
}

/**
 * Generate privacy-preserving user identifier
 * Uses SHA256 hash of IP + User-Agent
 */
function generateUserIdentifier(req: Request): string {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
}

/**
 * Extract IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }
  
  return req.ip || '127.0.0.1';
}

/**
 * Check if user has opted out (GDPR/CCPA)
 */
async function checkOptOut(userIdentifier: string): Promise<boolean> {
  // Check cache first (1 hour TTL)
  const cacheKey = `opt-out:${userIdentifier}`;
  const cached = await cache.get<boolean>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Check database (this would be implemented with dbPool in real usage)
  // For now, return false
  await cache.set(cacheKey, false, 3600);
  return false;
}

/**
 * Parse consent from cookie or header
 * Supports multiple consent mechanisms:
 * - Cookie: consent_cookie=1
 * - Header: X-Consent: granted
 * - Query param: consent=1 (for testing)
 */
function parseConsent(req: Request): boolean {
  // Check cookie
  const consentCookie = req.cookies?.['consent_cookie'];
  if (consentCookie === '1' || consentCookie === 'true') {
    return true;
  }
  
  // Check header
  const consentHeader = req.headers['x-consent'] as string;
  if (consentHeader === 'granted' || consentHeader === '1') {
    return true;
  }
  
  // Check query param (for testing only)
  const consentQuery = req.query.consent as string;
  if (consentQuery === '1' || consentQuery === 'true') {
    return true;
  }
  
  return false;
}

/**
 * Determine privacy mode based on consent and request context
 */
function determinePrivacyMode(hasConsent: boolean, isFirstParty: boolean): 'standard' | 'privacy-enhanced' | 'minimal' {
  if (hasConsent && isFirstParty) {
    return 'standard'; // Full tracking with consent on first-party
  } else if (hasConsent) {
    return 'privacy-enhanced'; // Tracking with consent but more privacy-conscious
  } else if (isFirstParty) {
    return 'privacy-enhanced'; // First-party contextual tracking without full consent
  } else {
    return 'minimal'; // Minimal tracking for third-party without consent
  }
}

/**
 * Check if request is first-party (same domain as publisher)
 * This is a simplified check - in production, you'd validate against registered domains
 */
function isFirstPartyRequest(req: Request): boolean {
  const referer = req.headers['referer'] || req.headers['referrer'] as string;
  const origin = req.headers['origin'] as string;
  
  // If no referer/origin, assume first-party (direct access)
  if (!referer && !origin) {
    return true;
  }
  
  // In production, you'd check against publisher's registered domains
  // For now, we'll consider it first-party if there's a referer
  return !!referer;
}

/**
 * Hash IP address for privacy-enhanced mode
 */
export function hashIPAddress(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT || 'buzzer-salt').digest('hex').substring(0, 16);
}

/**
 * Truncate user agent for privacy-enhanced mode
 */
export function truncateUserAgent(userAgent: string): string {
  // Keep only browser and OS, remove version details
  const parts = userAgent.split(' ');
  return parts.slice(0, 2).join(' ');
}

/**
 * Consent checking middleware
 * Adds consent information to request object
 */
export async function checkConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Generate user identifier
    const userIdentifier = generateUserIdentifier(req);
    
    // Check if user has opted out
    const isOptedOut = await checkOptOut(userIdentifier);
    
    if (isOptedOut) {
      // User has opted out - reject tracking request
      consentLogger.info('Request from opted-out user', {
        user_identifier: userIdentifier.substring(0, 8),
        path: req.path,
      });
      
      res.status(403).json({
        error: 'User has opted out of tracking',
      });
      return;
    }
    
    // Parse consent
    const hasConsent = parseConsent(req);
    
    // Determine if first-party request
    const isFirstParty = isFirstPartyRequest(req);
    
    // Determine privacy mode
    const privacyMode = determinePrivacyMode(hasConsent, isFirstParty);
    
    // Add consent info to request
    (req as any).consentInfo = {
      hasConsent,
      privacyMode,
      userIdentifier,
      isOptedOut: false,
    } as ConsentInfo;
    
    consentLogger.debug('Consent checked', {
      has_consent: hasConsent,
      privacy_mode: privacyMode,
      is_first_party: isFirstParty,
      path: req.path,
    });
    
    next();
  } catch (error) {
    consentLogger.error('Error checking consent', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });
    
    // On error, default to minimal privacy mode
    (req as any).consentInfo = {
      hasConsent: false,
      privacyMode: 'minimal',
      userIdentifier: generateUserIdentifier(req),
      isOptedOut: false,
    } as ConsentInfo;
    
    next();
  }
}

/**
 * Get consent info from request
 */
export function getConsentInfo(req: Request): ConsentInfo {
  return (req as any).consentInfo || {
    hasConsent: false,
    privacyMode: 'minimal',
    isOptedOut: false,
  };
}

/**
 * Apply privacy mode transformations to tracking data
 */
export function applyPrivacyMode(
  data: {
    ipAddress: string;
    userAgent: string;
    [key: string]: any;
  },
  privacyMode: 'standard' | 'privacy-enhanced' | 'minimal'
): {
  ipAddress: string | null;
  userAgent: string | null;
  [key: string]: any;
} {
  const result: any = { ...data };
  
  switch (privacyMode) {
    case 'minimal':
      // Minimal tracking: no IP, no user agent
      result.ipAddress = null;
      result.userAgent = null;
      break;
      
    case 'privacy-enhanced':
      // Privacy-enhanced: hashed IP, truncated user agent
      result.ipAddress = hashIPAddress(data.ipAddress);
      result.userAgent = truncateUserAgent(data.userAgent);
      break;
      
    case 'standard':
      // Standard: keep all data
      break;
  }
  
  return result;
}

