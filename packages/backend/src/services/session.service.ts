/**
 * Session Tracking Service
 * Manages user session IDs for analytics and frequency capping
 * Uses Redis with 30-minute TTL for session persistence
 */

import { randomUUID } from 'crypto';
import { cache } from '../config/redis.js';
import { Request } from 'express';

const SESSION_TTL = 1800; // 30 minutes in seconds
const SESSION_COOKIE_NAME = 'buzzer_session';

/**
 * Get or create session ID from request
 * Priority: Cookie > Header > Generate New
 */
export async function getOrCreateSessionId(req: Request): Promise<string> {
  // Check cookie first
  let sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  
  // Check header (for API clients)
  if (!sessionId) {
    sessionId = req.headers['x-session-id'] as string;
  }
  
  // Generate new session ID if none exists
  if (!sessionId) {
    sessionId = `sess_${randomUUID()}`;
  }
  
  // Extend session TTL in Redis
  await extendSession(sessionId);
  
  return sessionId;
}

/**
 * Extend session TTL in Redis
 */
export async function extendSession(sessionId: string): Promise<void> {
  const key = `session:${sessionId}`;
  await cache.set(key, true, SESSION_TTL);
}

/**
 * Check if session exists in Redis
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const key = `session:${sessionId}`;
  return await cache.exists(key);
}

/**
 * Invalidate session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const key = `session:${sessionId}`;
  await cache.del(key);
}

/**
 * Get session metadata (for analytics)
 */
export interface SessionMetadata {
  sessionId: string;
  isNew: boolean;
  expiresAt: Date;
}

export async function getSessionMetadata(req: Request): Promise<SessionMetadata> {
  const sessionId = await getOrCreateSessionId(req);
  const exists = await sessionExists(sessionId);
  
  return {
    sessionId,
    isNew: !exists,
    expiresAt: new Date(Date.now() + SESSION_TTL * 1000),
  };
}

