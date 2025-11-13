/**
 * Background Domain Verification Service
 * Handles automatic domain verification with exponential backoff
 */

import { dbPool } from '../config/database.js';
import { verifyDNS, verifyHTML, verifyFile } from './domain-verification.service.js';

// Exponential backoff schedule (in seconds)
const RETRY_SCHEDULE = [
  0,             // Attempt 1: immediate
  5 * 60,        // Attempt 2: 5 minutes
  30 * 60,       // Attempt 3: 30 minutes  
  6 * 60 * 60,   // Attempt 4: 6 hours
  24 * 60 * 60   // Attempt 5: 24 hours (final)
];

const MAX_ATTEMPTS = RETRY_SCHEDULE.length;

let workerInterval: NodeJS.Timeout | null = null;

/**
 * Get next retry delay based on attempt count
 */
export function getNextRetryDelay(attemptCount: number): number {
  if (attemptCount >= MAX_ATTEMPTS) {
    return -1; // No more retries
  }
  return RETRY_SCHEDULE[attemptCount];
}

/**
 * Schedule verification for a domain
 */
export async function scheduleVerification(
  domainId: string,
  currentAttempts: number = 0
): Promise<void> {
  const delay = getNextRetryDelay(currentAttempts);
  
  if (delay === -1) {
    // Max attempts reached, no more scheduling
    await dbPool.query(
      `UPDATE publisher_domains 
       SET next_verification_at = NULL,
           verification_error = 'Maximum verification attempts reached. Please verify your DNS/HTML setup and try again manually.'
       WHERE id = $1`,
      [domainId]
    );
    return;
  }

  const nextCheckTime = new Date(Date.now() + delay * 1000);
  
  await dbPool.query(
    `UPDATE publisher_domains 
     SET next_verification_at = $1,
         verification_attempts = $2
     WHERE id = $3`,
    [nextCheckTime, currentAttempts, domainId]
  );
}

/**
 * Update verification status for a domain
 */
export async function updateVerificationStatus(
  domainId: string,
  verified: boolean,
  error: string | null = null
): Promise<void> {
  const now = new Date();
  
  if (verified) {
    // Verification successful
    await dbPool.query(
      `UPDATE publisher_domains 
       SET domain_verified = true,
           status = 'approved',
           last_verification_attempt = $1,
           next_verification_at = NULL,
           verification_error = NULL
       WHERE id = $2`,
      [now, domainId]
    );
    
    // Also update publisher status if this is their first verified domain
    const domainResult = await dbPool.query(
      'SELECT publisher_id FROM publisher_domains WHERE id = $1',
      [domainId]
    );
    
    if (domainResult.rows.length > 0) {
      const publisherId = domainResult.rows[0].publisher_id;
      
      // Check if publisher has any verified domains
      const verifiedCount = await dbPool.query(
        'SELECT COUNT(*) as count FROM publisher_domains WHERE publisher_id = $1 AND domain_verified = true',
        [publisherId]
      );
      
      if (verifiedCount.rows[0].count > 0) {
        await dbPool.query(
          `UPDATE publishers SET status = 'approved' WHERE id = $1 AND status = 'pending'`,
          [publisherId]
        );
      }
    }
  } else {
    // Verification failed, update error
    await dbPool.query(
      `UPDATE publisher_domains 
       SET last_verification_attempt = $1,
           verification_error = $2
       WHERE id = $3`,
      [now, error, domainId]
    );
  }
}

/**
 * Attempt verification for a single domain
 */
export async function attemptVerification(domainId: string): Promise<boolean> {
  try {
    // Get domain info
    const result = await dbPool.query(
      `SELECT pd.id, pd.website_url, pd.verification_token, pd.verification_attempts, pd.domain_verified
       FROM publisher_domains pd
       WHERE pd.id = $1`,
      [domainId]
    );

    if (result.rows.length === 0) {
      console.log(`Domain ${domainId} not found`);
      return false;
    }

    const domain = result.rows[0];
    
    // Skip if already verified
    if (domain.domain_verified) {
      console.log(`Domain ${domainId} already verified`);
      return true;
    }

    const websiteUrl = domain.website_url;
    const token = domain.verification_token;

    // Try all verification methods in order: DNS → HTML → File
    let verified = false;
    let lastError = '';

    // Try DNS verification
    try {
      await verifyDNS(websiteUrl, token);
      verified = true;
      console.log(`✅ Domain ${websiteUrl} verified via DNS`);
    } catch (dnsError) {
      lastError = dnsError instanceof Error ? dnsError.message : 'DNS verification failed';
    }

    // Try HTML verification if DNS failed
    if (!verified) {
      try {
        await verifyHTML(websiteUrl, token);
        verified = true;
        console.log(`✅ Domain ${websiteUrl} verified via HTML`);
      } catch (htmlError) {
        lastError = htmlError instanceof Error ? htmlError.message : 'HTML verification failed';
      }
    }

    // Try File verification if both failed
    if (!verified) {
      try {
        await verifyFile(websiteUrl, 'buzzer-verification.txt', token);
        verified = true;
        console.log(`✅ Domain ${websiteUrl} verified via File`);
      } catch (fileError) {
        lastError = fileError instanceof Error ? fileError.message : 'File verification failed';
      }
    }

    // Update status
    await updateVerificationStatus(domainId, verified, verified ? null : lastError);

    if (!verified) {
      // Schedule next retry
      const nextAttempts = domain.verification_attempts + 1;
      await scheduleVerification(domainId, nextAttempts);
      console.log(`❌ Domain ${websiteUrl} verification failed (attempt ${nextAttempts}/${MAX_ATTEMPTS}). Next retry scheduled.`);
    }

    return verified;
  } catch (error) {
    console.error(`Error attempting verification for domain ${domainId}:`, error);
    
    // Update with error and schedule retry
    const errorMessage = error instanceof Error ? error.message : 'Verification failed';
    await updateVerificationStatus(domainId, false, errorMessage);
    
    const domainResult = await dbPool.query(
      'SELECT verification_attempts FROM publisher_domains WHERE id = $1',
      [domainId]
    );
    
    if (domainResult.rows.length > 0) {
      const nextAttempts = domainResult.rows[0].verification_attempts + 1;
      await scheduleVerification(domainId, nextAttempts);
    }
    
    return false;
  }
}

/**
 * Process verification queue
 * Finds all domains that need verification and processes them
 */
export async function processVerificationQueue(): Promise<void> {
  try {
    const now = new Date();
    
    // Find domains that need verification
    const result = await dbPool.query(
      `SELECT id, website_url, verification_attempts
       FROM publisher_domains
       WHERE domain_verified = false
         AND next_verification_at IS NOT NULL
         AND next_verification_at <= $1
         AND verification_attempts < $2
       ORDER BY next_verification_at ASC
       LIMIT 10`,
      [now, MAX_ATTEMPTS]
    );

    if (result.rows.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${result.rows.length} domain(s) for verification`);

    // Process each domain
    for (const domain of result.rows) {
      await attemptVerification(domain.id);
    }
  } catch (error) {
    console.error('Error processing verification queue:', error);
  }
}

/**
 * Start background verification worker
 * Runs every minute to check for domains needing verification
 */
export function startVerificationWorker(): void {
  if (workerInterval) {
    console.log('⚠️  Verification worker already running');
    return;
  }

  console.log('🚀 Starting background verification worker (runs every 1 minute)');
  
  // Run immediately on start
  processVerificationQueue();
  
  // Then run every minute
  workerInterval = setInterval(() => {
    processVerificationQueue();
  }, 60 * 1000); // 1 minute
}

/**
 * Stop background verification worker
 */
export function stopVerificationWorker(): void {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('🛑 Stopped background verification worker');
  }
}

