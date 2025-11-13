/**
 * Tracking Configuration
 * Centralized configuration for click tracking, fraud detection, and privacy settings
 */

export interface TrackingConfig {
  // Attribution Windows (in days)
  attribution: {
    defaultWindow: number;
    shortWindow: number;
    longWindow: number;
    maxWindow: number;
  };
  
  // Fraud Detection Thresholds
  fraud: {
    cleanThreshold: number;      // Below this = clean traffic
    suspiciousThreshold: number; // Above this = suspicious (track but no revenue)
    fraudThreshold: number;       // Above this = fraud (don't track)
    blockThreshold: number;       // Above this = block completely
    fastClickWindowMs: number;    // Clicks faster than this after impression = suspicious
  };
  
  // Privacy Settings
  privacy: {
    modes: {
      standard: 'standard';
      privacyEnhanced: 'privacy-enhanced';
      minimal: 'minimal';
    };
    defaultMode: string;
    requireConsentForCrossSite: boolean;
    hashIPsInPrivacyMode: boolean;
    sessionOnlyInMinimalMode: boolean;
  };
  
  // IVT Detection
  ivt: {
    enableGIVT: boolean;
    enableSIVT: boolean;
    sivtSamplingRate: {
      impressions: number; // 0.0 - 1.0
      clicks: number;      // 0.0 - 1.0 (typically 1.0 for all clicks)
    };
  };
  
  // Deduplication
  deduplication: {
    impressionWindowSeconds: number; // IAB standard: 24 hours
    clickWindowSeconds: number;       // IAB standard: 24 hours
  };
  
  // Rate Limiting
  rateLimits: {
    adServing: {
      windowMs: number;
      maxRequests: number;
    };
    tracking: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // Performance
  performance: {
    maxRedirectTimeMs: number; // Target redirect time
    cacheInvalidationThresholds: number[]; // Budget % thresholds for cache invalidation
  };
}

/**
 * Default tracking configuration
 */
export const trackingConfig: TrackingConfig = {
  // Attribution Windows (in days)
  attribution: {
    defaultWindow: 30,    // Industry standard for click attribution
    shortWindow: 7,       // Short attribution window
    longWindow: 30,       // Long attribution window
    maxWindow: 90,        // Maximum attribution window
  },
  
  // Fraud Detection Thresholds
  fraud: {
    cleanThreshold: 0.5,        // Score < 0.5 = clean
    suspiciousThreshold: 0.7,   // Score >= 0.7 = suspicious
    fraudThreshold: 0.7,        // Score >= 0.7 = don't count revenue
    blockThreshold: 0.9,        // Score >= 0.9 = block completely
    fastClickWindowMs: 1000,    // Clicks < 1 second after impression are suspicious
  },
  
  // Privacy Settings
  privacy: {
    modes: {
      standard: 'standard',
      privacyEnhanced: 'privacy-enhanced',
      minimal: 'minimal',
    },
    defaultMode: 'standard',
    requireConsentForCrossSite: true,
    hashIPsInPrivacyMode: true,
    sessionOnlyInMinimalMode: true,
  },
  
  // IVT Detection
  ivt: {
    enableGIVT: true,
    enableSIVT: true,
    sivtSamplingRate: {
      impressions: 0.15, // 15% sampling for impressions
      clicks: 1.0,       // 100% checking for clicks
    },
  },
  
  // Deduplication
  deduplication: {
    impressionWindowSeconds: 86400, // 24 hours (IAB standard)
    clickWindowSeconds: 86400,       // 24 hours (IAB standard)
  },
  
  // Rate Limiting
  rateLimits: {
    adServing: {
      windowMs: 60000,       // 1 minute
      maxRequests: 6000,     // 100 req/s per publisher
    },
    tracking: {
      windowMs: 60000,       // 1 minute
      maxRequests: 10000,    // Higher limit for tracking
    },
  },
  
  // Performance
  performance: {
    maxRedirectTimeMs: 200,  // Target < 200ms redirect time
    cacheInvalidationThresholds: [25, 50, 75, 90, 100], // Budget % thresholds
  },
};

/**
 * Get fraud status based on score
 */
export function getFraudStatusFromScore(score: number): 'clean' | 'suspicious' | 'fraud' {
  if (score < trackingConfig.fraud.cleanThreshold) {
    return 'clean';
  } else if (score < trackingConfig.fraud.suspiciousThreshold) {
    return 'suspicious';
  } else {
    return 'fraud';
  }
}

/**
 * Check if traffic should be blocked based on fraud score
 */
export function shouldBlockTraffic(score: number): boolean {
  return score >= trackingConfig.fraud.blockThreshold;
}

/**
 * Check if revenue should be counted for this fraud score
 */
export function shouldCountRevenue(score: number): boolean {
  return score < trackingConfig.fraud.fraudThreshold;
}

/**
 * Get attribution window in days based on type
 */
export function getAttributionWindow(type: 'default' | 'short' | 'long' = 'default'): number {
  switch (type) {
    case 'short':
      return trackingConfig.attribution.shortWindow;
    case 'long':
      return trackingConfig.attribution.longWindow;
    default:
      return trackingConfig.attribution.defaultWindow;
  }
}

/**
 * Get attribution window in seconds
 */
export function getAttributionWindowSeconds(type: 'default' | 'short' | 'long' = 'default'): number {
  return getAttributionWindow(type) * 24 * 60 * 60;
}

/**
 * Environment-based configuration overrides
 */
export function getTrackingConfig(): TrackingConfig {
  const config = { ...trackingConfig };
  
  // Override from environment variables if present
  if (process.env.ATTRIBUTION_WINDOW_DAYS) {
    config.attribution.defaultWindow = parseInt(process.env.ATTRIBUTION_WINDOW_DAYS, 10);
  }
  
  if (process.env.FRAUD_BLOCK_THRESHOLD) {
    config.fraud.blockThreshold = parseFloat(process.env.FRAUD_BLOCK_THRESHOLD);
  }
  
  if (process.env.PRIVACY_MODE) {
    config.privacy.defaultMode = process.env.PRIVACY_MODE;
  }
  
  return config;
}

