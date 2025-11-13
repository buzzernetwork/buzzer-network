/**
 * Integration Code Generation Service
 * Generates X402-compliant ad slot integration code for publishers
 */

import { stringToSize } from '../config/iab-ad-sizes.js';

export interface SlotConfig {
  slot_id: string;
  publisher_id: string;
  name: string;
  primary_size: string;
  format: string;
  refresh_enabled: boolean;
  refresh_interval?: number;
  lazy_load: boolean;
}

/**
 * Generate integration code for ad slot
 */
export function generateIntegrationCode(slot: SlotConfig): string {
  const size = stringToSize(slot.primary_size);
  if (!size) {
    throw new Error('Invalid primary size');
  }
  
  const { width, height } = size;
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const cdnUrl = process.env.CDN_URL || apiUrl;
  
  // Generate container div with reserved space
  const containerCode = `<div id="buzzer-ad-${slot.slot_id}" 
     data-buzzer-slot="${slot.slot_id}"
     style="min-width: ${width}px; min-height: ${height}px; display: inline-block;">
  <!-- Ad will load here -->
</div>`;
  
  // Generate script tag with configuration
  const scriptCode = `<script async 
        src="${cdnUrl}/x402-ad.js"
        data-publisher-id="${slot.publisher_id}"
        data-slot-id="${slot.slot_id}"${slot.refresh_enabled ? `
        data-refresh-enabled="true"
        data-refresh-interval="${slot.refresh_interval || 30}"` : ''}${slot.lazy_load ? `
        data-lazy-load="true"` : ''}></script>`;
  
  return `<!-- Buzzer Network Ad Slot: ${slot.name} -->
${containerCode}
${scriptCode}`;
}

/**
 * Generate instructions for ad slot integration
 */
export function generateIntegrationInstructions(slot: SlotConfig): {
  steps: string[];
  notes: string[];
  troubleshooting: string[];
} {
  const size = stringToSize(slot.primary_size);
  const { width, height } = size || { width: 0, height: 0 };
  
  return {
    steps: [
      'Copy the integration code above',
      'Paste it into your website\'s HTML where you want the ad to appear',
      `Ensure there\'s at least ${width}x${height}px of space available`,
      'Save and deploy your changes',
      'Ads will start serving automatically once your domain is verified',
    ],
    notes: [
      `This slot is configured for ${slot.format} ads`,
      `Primary size: ${slot.primary_size} (${width}x${height}px)`,
      slot.refresh_enabled 
        ? `Ad refresh enabled: every ${slot.refresh_interval} seconds`
        : 'Ad refresh disabled - ads are static',
      slot.lazy_load 
        ? 'Lazy loading enabled - ads load when scrolled into view'
        : 'Ads load immediately on page load',
      'All impressions and clicks are automatically tracked',
    ],
    troubleshooting: [
      'Ads not showing? Check that your domain is verified in the dashboard',
      'Make sure you have active campaigns matching your slot format',
      'Check browser console for any JavaScript errors',
      'Verify the integration code is in the correct location',
      'Allow up to 5 minutes for changes to propagate',
    ],
  };
}

/**
 * Generate test page HTML for ad slot
 */
export function generateTestPage(slot: SlotConfig): string {
  const integrationCode = generateIntegrationCode(slot);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Page: ${slot.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .ad-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      display: inline-block;
    }
    .info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      border-left: 4px solid #2196f3;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ad Slot Test Page</h1>
    <p><strong>Slot Name:</strong> ${slot.name}</p>
    <p><strong>Slot ID:</strong> ${slot.slot_id}</p>
  </div>
  
  <div class="ad-container">
    ${integrationCode}
  </div>
  
  <div class="info">
    <p><strong>Test Instructions:</strong></p>
    <ul>
      <li>This page demonstrates how the ad slot will appear on your website</li>
      <li>Open browser console (F12) to see any errors or tracking events</li>
      <li>Check that the ad loads and tracks impressions correctly</li>
      <li>Test click tracking by clicking on the ad</li>
    </ul>
  </div>
</body>
</html>`;
}

/**
 * Generate curl command for testing ad serving
 */
export function generateCurlTest(slot: SlotConfig): string {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  
  return `curl "${apiUrl}/x402/ad?pub_id=${slot.publisher_id}&slot_id=${slot.slot_id}&format=${slot.format}&device=desktop"`;
}

