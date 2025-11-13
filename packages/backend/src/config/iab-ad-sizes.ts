/**
 * IAB Standard Ad Sizes
 * Industry-standard ad dimensions and recommended combinations
 */

export interface AdSize {
  width: number;
  height: number;
  label: string;
  category: 'desktop' | 'mobile' | 'universal';
}

export const IAB_AD_SIZES: Record<string, AdSize> = {
  // Desktop Standard Sizes
  MEDIUM_RECTANGLE: { width: 300, height: 250, label: 'Medium Rectangle', category: 'desktop' },
  LARGE_RECTANGLE: { width: 336, height: 280, label: 'Large Rectangle', category: 'desktop' },
  LEADERBOARD: { width: 728, height: 90, label: 'Leaderboard', category: 'desktop' },
  BILLBOARD: { width: 970, height: 250, label: 'Billboard', category: 'desktop' },
  WIDE_SKYSCRAPER: { width: 160, height: 600, label: 'Wide Skyscraper', category: 'desktop' },
  HALF_PAGE: { width: 300, height: 600, label: 'Half Page', category: 'desktop' },
  PORTRAIT: { width: 300, height: 1050, label: 'Portrait', category: 'desktop' },
  
  // Mobile Standard Sizes
  MOBILE_BANNER: { width: 320, height: 50, label: 'Mobile Banner', category: 'mobile' },
  MOBILE_LARGE_BANNER: { width: 320, height: 100, label: 'Large Mobile Banner', category: 'mobile' },
  MOBILE_MEDIUM_RECTANGLE: { width: 300, height: 250, label: 'Mobile Rectangle', category: 'mobile' },
  
  // Universal (works on both)
  SQUARE: { width: 250, height: 250, label: 'Square', category: 'universal' },
  SMALL_SQUARE: { width: 200, height: 200, label: 'Small Square', category: 'universal' },
};

// Recommended multi-size combinations for better fill rates
export const RECOMMENDED_MULTI_SIZE_COMBOS: Array<{
  name: string;
  sizes: string[];
  description: string;
  position: string;
}> = [
  {
    name: 'Rectangle Combo',
    sizes: ['300x250', '336x280'],
    description: 'Best for content areas and sidebars',
    position: 'above_fold',
  },
  {
    name: 'Leaderboard Combo',
    sizes: ['728x90', '970x250'],
    description: 'Best for header and top positions',
    position: 'above_fold',
  },
  {
    name: 'Sidebar Combo',
    sizes: ['300x250', '300x600', '160x600'],
    description: 'Best for sidebar placements',
    position: 'sidebar',
  },
  {
    name: 'Mobile Combo',
    sizes: ['320x50', '320x100', '300x250'],
    description: 'Best for mobile devices',
    position: 'above_fold',
  },
];

// Convert size object to string format (e.g., "300x250")
export function sizeToString(size: { width: number; height: number }): string {
  return `${size.width}x${size.height}`;
}

// Convert string to size object
export function stringToSize(sizeStr: string): { width: number; height: number } | null {
  const parts = sizeStr.split('x');
  if (parts.length !== 2) return null;
  
  const width = parseInt(parts[0]);
  const height = parseInt(parts[1]);
  
  if (isNaN(width) || isNaN(height)) return null;
  
  return { width, height };
}

// Validate if a size string is a valid IAB standard
export function isValidIABSize(sizeStr: string): boolean {
  const size = stringToSize(sizeStr);
  if (!size) return false;
  
  return Object.values(IAB_AD_SIZES).some(
    iabSize => iabSize.width === size.width && iabSize.height === size.height
  );
}

// Get all sizes as string array
export function getAllSizesAsStrings(): string[] {
  return Object.values(IAB_AD_SIZES).map(size => sizeToString(size));
}

// Get sizes filtered by category
export function getSizesByCategory(category: 'desktop' | 'mobile' | 'universal'): string[] {
  return Object.values(IAB_AD_SIZES)
    .filter(size => size.category === category || size.category === 'universal')
    .map(size => sizeToString(size));
}

