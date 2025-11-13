/**
 * Ad Slot Validation Service
 * Validates slot configurations against industry standards
 */

import { isValidIABSize, stringToSize } from '../config/iab-ad-sizes.js';
import crypto from 'crypto';

export interface SlotData {
  name: string;
  path?: string;
  format: 'banner' | 'native' | 'video';
  sizes: string[];
  primary_size: string;
  position?: 'above_fold' | 'below_fold' | 'sidebar' | 'footer';
  refresh_enabled?: boolean;
  refresh_interval?: number;
  lazy_load?: boolean;
  viewability_threshold?: number;
  floor_price?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate slot configuration
 */
export function validateSlot(slotData: SlotData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate name
  if (!slotData.name || slotData.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Slot name is required' });
  } else if (slotData.name.length > 100) {
    errors.push({ field: 'name', message: 'Slot name must be less than 100 characters' });
  }
  
  // Validate format
  if (!['banner', 'native', 'video'].includes(slotData.format)) {
    errors.push({ field: 'format', message: 'Format must be banner, native, or video' });
  }
  
  // Validate sizes array
  if (!slotData.sizes || slotData.sizes.length === 0) {
    errors.push({ field: 'sizes', message: 'At least one size is required' });
  } else {
    // Validate each size
    for (const size of slotData.sizes) {
      if (!isValidIABSize(size)) {
        errors.push({ 
          field: 'sizes', 
          message: `Invalid size: ${size}. Must be a valid IAB standard size (e.g., 300x250)` 
        });
      }
    }
  }
  
  // Validate primary_size
  if (!slotData.primary_size) {
    errors.push({ field: 'primary_size', message: 'Primary size is required' });
  } else if (!slotData.sizes.includes(slotData.primary_size)) {
    errors.push({ 
      field: 'primary_size', 
      message: 'Primary size must be one of the selected sizes' 
    });
  } else if (!isValidIABSize(slotData.primary_size)) {
    errors.push({ 
      field: 'primary_size', 
      message: `Invalid primary size: ${slotData.primary_size}` 
    });
  }
  
  // Validate position
  if (slotData.position && !['above_fold', 'below_fold', 'sidebar', 'footer'].includes(slotData.position)) {
    errors.push({ 
      field: 'position', 
      message: 'Position must be above_fold, below_fold, sidebar, or footer' 
    });
  }
  
  // Validate refresh settings
  if (slotData.refresh_enabled && slotData.refresh_interval) {
    if (slotData.refresh_interval < 30) {
      errors.push({ 
        field: 'refresh_interval', 
        message: 'Refresh interval must be at least 30 seconds (policy compliance)' 
      });
    } else if (slotData.refresh_interval > 300) {
      errors.push({ 
        field: 'refresh_interval', 
        message: 'Refresh interval must be less than 300 seconds (5 minutes)' 
      });
    }
  }
  
  // Validate viewability threshold
  if (slotData.viewability_threshold !== undefined) {
    if (slotData.viewability_threshold < 0 || slotData.viewability_threshold > 1) {
      errors.push({ 
        field: 'viewability_threshold', 
        message: 'Viewability threshold must be between 0 and 1 (e.g., 0.5 for 50%)' 
      });
    }
  }
  
  // Validate floor price
  if (slotData.floor_price !== undefined) {
    if (slotData.floor_price < 0) {
      errors.push({ 
        field: 'floor_price', 
        message: 'Floor price must be positive' 
      });
    } else if (slotData.floor_price > 1000) {
      errors.push({ 
        field: 'floor_price', 
        message: 'Floor price must be less than $1000 CPM' 
      });
    }
  }
  
  return errors;
}

/**
 * Generate unique slot ID
 * Format: bs_{publisherId}_{random8chars}
 */
export function generateSlotId(publisherId: string): string {
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `bs_${publisherId.slice(0, 8)}_${randomPart}`;
}

/**
 * Sanitize slot path
 */
export function sanitizeSlotPath(path: string | undefined): string | null {
  if (!path) return null;
  
  // Remove leading/trailing slashes
  let sanitized = path.trim().replace(/^\/+|\/+$/g, '');
  
  // Replace multiple slashes with single slash
  sanitized = sanitized.replace(/\/+/g, '/');
  
  // Validate characters (only alphanumeric, hyphens, underscores, and slashes)
  if (!/^[a-zA-Z0-9\-_\/]+$/.test(sanitized)) {
    return null;
  }
  
  return sanitized || null;
}

/**
 * Validate slot dimensions
 */
export function validateDimensions(dimensions: string): boolean {
  const size = stringToSize(dimensions);
  if (!size) return false;
  
  // Check reasonable bounds
  if (size.width < 50 || size.width > 2000) return false;
  if (size.height < 50 || size.height > 2000) return false;
  
  return true;
}

