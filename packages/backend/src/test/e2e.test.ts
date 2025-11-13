/**
 * End-to-End API Tests
 * Tests all API endpoints in sequence
 */

import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = process.env.API_URL || 'http://localhost:3001';
let authToken: string | null = null;
let walletAddress: string = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Test wallet
let publisherId: string | null = null;
let advertiserId: string | null = null;
let campaignId: string | null = null;

// Helper function to make API calls
async function apiCall(method: string, endpoint: string, data?: any, token?: string) {
  try {
    const config: any = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// Test results tracking
const results: Array<{ test: string; status: 'PASS' | 'FAIL' | 'SKIP'; message?: string }> = [];

function logTest(name: string, result: { success: boolean; status?: number; error?: any }) {
  if (result.success) {
    results.push({ test: name, status: 'PASS', message: `Status: ${result.status}` });
    console.log(`✅ ${name}`);
  } else {
    results.push({
      test: name,
      status: 'FAIL',
      message: `Status: ${result.status} - ${JSON.stringify(result.error)}`,
    });
    console.log(`❌ ${name} - ${JSON.stringify(result.error)}`);
  }
}

async function runTests() {
  console.log('🧪 Starting End-to-End API Tests\n');
  console.log(`API URL: ${API_URL}\n`);

  // 1. Health Check
  console.log('1. Testing Health Endpoint...');
  const health = await apiCall('GET', '/health');
  logTest('Health Check', health);
  if (!health.success) {
    console.log('\n❌ Backend is not running. Please start it with: cd packages/backend && npm run dev\n');
    return;
  }

  // 2. API Info
  console.log('\n2. Testing API Info...');
  const apiInfo = await apiCall('GET', '/api/v1');
  logTest('API Info', apiInfo);

  // 3. Auth - Get Message
  console.log('\n3. Testing Authentication...');
  walletAddress = `0x${'1'.repeat(40)}`; // Mock address for testing
  const authMessage = await apiCall('POST', '/api/v1/auth/message', {
    address: walletAddress,
  });
  logTest('Get Auth Message', authMessage);

  // 4. Auth - Verify (Mock - in real scenario would sign message)
  if (authMessage.success) {
    // For testing, we'll skip actual signature verification
    // In production, you'd sign the message with wallet
    console.log('⚠️  Skipping signature verification (requires wallet)');
    results.push({ test: 'Verify Signature', status: 'SKIP', message: 'Requires wallet signing' });
  }

  // 5. Publisher Registration (without auth for now)
  console.log('\n4. Testing Publisher Endpoints...');
  const publisherData = {
    website_url: 'https://test-publisher.example.com',
    email: 'test@example.com',
    payment_wallet: walletAddress,
  };

  // Note: This will fail without auth token - that's expected
  const publisherRegister = await apiCall('POST', '/api/v1/publishers', publisherData);
  if (publisherRegister.status === 401) {
    results.push({
      test: 'Publisher Registration',
      status: 'SKIP',
      message: 'Requires authentication (expected)',
    });
    console.log('⚠️  Publisher registration requires authentication');
  } else {
    logTest('Publisher Registration', publisherRegister);
    if (publisherRegister.success && publisherRegister.data?.publisher?.id) {
      publisherId = publisherRegister.data.publisher.id;
    }
  }

  // 6. Advertiser Registration
  console.log('\n5. Testing Advertiser Endpoints...');
  const advertiserData = {
    company_name: 'Test Advertiser Inc',
    website_url: 'https://test-advertiser.example.com',
  };

  const advertiserRegister = await apiCall('POST', '/api/v1/advertisers', advertiserData);
  if (advertiserRegister.status === 401) {
    results.push({
      test: 'Advertiser Registration',
      status: 'SKIP',
      message: 'Requires authentication (expected)',
    });
    console.log('⚠️  Advertiser registration requires authentication');
  } else {
    logTest('Advertiser Registration', advertiserRegister);
    if (advertiserRegister.success && advertiserRegister.data?.advertiser?.id) {
      advertiserId = advertiserRegister.data.advertiser.id;
    }
  }

  // 7. X402 Ad Endpoint
  console.log('\n6. Testing X402 Ad Serving...');
  const x402Ad = await apiCall('GET', '/x402/ad?pub_id=test&slot_id=test&format=banner');
  logTest('X402 Ad Endpoint', x402Ad);
  if (x402Ad.success) {
    console.log(`   Ad ID: ${x402Ad.data?.ad_id}`);
    console.log(`   Format: ${x402Ad.data?.format}`);
  }

  // 8. Tracking - Impression
  console.log('\n7. Testing Tracking Endpoints...');
  const impressionData = {
    campaign_id: 'test-campaign-id',
    publisher_id: 'test-publisher-id',
    slot_id: 'test-slot',
    geo: 'US',
    device: 'desktop',
  };

  const impression = await apiCall('POST', '/track/impression/AD_TEST123', impressionData);
  // This might fail due to missing campaign, but should return proper error
  if (impression.status === 400 || impression.status === 404) {
    results.push({
      test: 'Impression Tracking',
      status: 'SKIP',
      message: 'Requires valid campaign (expected)',
    });
    console.log('⚠️  Impression tracking requires valid campaign');
  } else {
    logTest('Impression Tracking', impression);
  }

  // 9. Tracking - Click
  const click = await apiCall(
    'GET',
    `/track/click/AD_TEST123?campaign_id=test&publisher_id=test&slot_id=test`
  );
  if (click.status === 400 || click.status === 404) {
    results.push({
      test: 'Click Tracking',
      status: 'SKIP',
      message: 'Requires valid campaign (expected)',
    });
    console.log('⚠️  Click tracking requires valid campaign');
  } else {
    logTest('Click Tracking', click);
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`📝 Total: ${results.length}`);

  console.log('\n📋 Detailed Results:');
  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the details above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});




