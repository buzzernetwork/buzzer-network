/**
 * Domain Verification Service
 * Implements DNS, HTML meta tag, and file upload verification methods
 */

import dns from 'dns/promises';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface VerificationResult {
  success: boolean;
  method: 'dns' | 'html' | 'file';
  message: string;
}

/**
 * Verify domain ownership via DNS TXT record
 */
export async function verifyDNS(
  domain: string,
  expectedRecord: string
): Promise<VerificationResult> {
  try {
    // Extract domain from URL if needed
    let domainName: string;
    try {
      domainName = domain.startsWith('http') 
        ? new URL(domain).hostname 
        : domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch {
      domainName = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    // Query DNS TXT records
    const records = await dns.resolveTxt(`_buzzer-verify.${domainName}`);
    
    // Flatten TXT records (they come as arrays)
    const flattenedRecords = records.flat();
    
    // Check if expected record exists
    const found = flattenedRecords.some(record => 
      record.includes(expectedRecord) || record === expectedRecord
    );

    if (found) {
      return {
        success: true,
        method: 'dns',
        message: 'DNS verification successful',
      };
    }

    return {
      success: false,
      method: 'dns',
      message: `DNS TXT record not found. Add TXT record: _buzzer-verify.${domainName} with value: ${expectedRecord}`,
    };
  } catch (error) {
    return {
      success: false,
      method: 'dns',
      message: `DNS verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify domain ownership via HTML meta tag
 */
export async function verifyHTML(
  websiteUrl: string,
  expectedMetaContent: string
): Promise<VerificationResult> {
  try {
    // Fetch the website HTML
    const html = await fetchHTML(websiteUrl);
    
    // Look for meta tag: <meta name="buzzer-verification" content="...">
    const metaRegex = /<meta\s+name=["']buzzer-verification["']\s+content=["']([^"']+)["']\s*\/?>/i;
    const match = html.match(metaRegex);

    if (match && match[1] === expectedMetaContent) {
      return {
        success: true,
        method: 'html',
        message: 'HTML meta tag verification successful',
      };
    }

    return {
      success: false,
      method: 'html',
      message: `Meta tag not found. Add to your HTML: <meta name="buzzer-verification" content="${expectedMetaContent}">`,
    };
  } catch (error) {
    return {
      success: false,
      method: 'html',
      message: `HTML verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify domain ownership via file upload
 * Checks if a specific file exists at the website root
 */
export async function verifyFile(
  websiteUrl: string,
  filename: string = 'buzzer-verification.txt',
  expectedContent: string
): Promise<VerificationResult> {
  try {
    // Construct file URL
    const baseUrl = websiteUrl.endsWith('/') ? websiteUrl : `${websiteUrl}/`;
    const fileUrl = `${baseUrl}${filename}`;

    // Fetch the file
    const content = await fetchText(fileUrl);

    // Check if content matches
    if (content.trim() === expectedContent.trim()) {
      return {
        success: true,
        method: 'file',
        message: 'File verification successful',
      };
    }

    return {
      success: false,
      method: 'file',
      message: `File content mismatch. Upload ${filename} to your website root with content: ${expectedContent}`,
    };
  } catch (error) {
    return {
      success: false,
      method: 'file',
      message: `File verification failed: ${error instanceof Error ? error.message : 'Unknown error'}. Upload ${filename} to your website root.`,
    };
  }
}

/**
 * Generate verification token for publisher
 */
export function generateVerificationToken(publisherId: string, walletAddress: string): string {
  // Generate a unique token based on publisher ID and wallet
  const hash = require('crypto')
    .createHash('sha256')
    .update(`${publisherId}-${walletAddress}-${Date.now()}`)
    .digest('hex')
    .substring(0, 16);
  
  return `buzzer-${hash}`;
}

/**
 * Fetch HTML content from URL
 */
function fetchHTML(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Buzzer Network Verification Bot',
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Fetch text content from URL
 */
function fetchText(url: string): Promise<string> {
  return fetchHTML(url); // Same implementation
}

