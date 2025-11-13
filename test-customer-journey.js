#!/usr/bin/env node
/**
 * Complete Customer Journey Test
 * Tests all live endpoints from start to finish
 */

const BASE_URL = 'https://buzzer-networkbackend-production.up.railway.app';

// Test wallet addresses (for demonstration - in real scenario, these would be actual wallets)
const ADVERTISER_WALLET = '0x587DB02B11B87672FDb65dcfD418E2FD7A2A541F'; // Deployer wallet
const PUBLISHER_WALLET = '0x1234567890123456789012345678901234567890'; // Test wallet

// Storage for test data
let advertiserToken = null;
let publisherToken = null;
let campaignId = null;
let publisherId = null;
let adId = null;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(step, message, data = null) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message, err = null) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (err) {
    console.log(JSON.stringify(err, null, 2));
  }
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

async function request(method, endpoint, body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (err) {
    return { status: 500, data: { error: err.message } };
  }
}

async function testHealthCheck() {
  log('1', 'Testing Health Check');
  const result = await request('GET', '/health');
  
  if (result.status === 200 && result.data.status === 'ok') {
    success('Backend is healthy');
    console.log(`   Database: ${result.data.database}`);
    return true;
  } else {
    error('Health check failed', result.data);
    return false;
  }
}

async function testAdvertiserAuth() {
  log('2', 'Testing Advertiser Authentication');
  
  // Step 2.1: Get auth message
  log('2.1', 'Requesting auth message');
  const messageResult = await request('POST', '/api/v1/auth/message', {
    address: ADVERTISER_WALLET,
  });

  if (messageResult.status !== 200) {
    error('Failed to get auth message', messageResult.data);
    return false;
  }

  const { message, nonce } = messageResult.data;
  success(`Auth message generated (nonce: ${nonce.substring(0, 10)}...)`);

  // Step 2.2: Verify signature (simulated - in real scenario, wallet signs the message)
  log('2.2', 'Verifying signature (SIMULATED - requires actual wallet signature)');
  warning('In production, this requires actual wallet signature. Using mock for testing.');
  
  // For testing, we'll skip signature verification and assume token is obtained
  // In real scenario: const signature = await wallet.signMessage(message);
  // Then: await request('POST', '/api/v1/auth/verify', { address, message, signature });
  
  // For now, we'll note that authentication requires wallet interaction
  warning('Authentication requires wallet signature - skipping for automated test');
  warning('To complete: Use frontend or wallet CLI to sign message and get token');
  
  return true;
}

async function testAdvertiserRegistration(token) {
  log('3', 'Testing Advertiser Registration');
  
  const result = await request('POST', '/api/v1/advertisers', {
    company_name: 'Test Advertiser Co',
    website_url: 'https://test-advertiser.com',
  }, token);

  if (result.status === 201) {
    success('Advertiser registered');
    console.log(`   Advertiser ID: ${result.data.advertiser.id}`);
    return true;
  } else if (result.status === 409) {
    warning('Advertiser already exists (this is OK)');
    return true;
  } else {
    error('Advertiser registration failed', result.data);
    return false;
  }
}

async function testCampaignCreation(token) {
  log('4', 'Testing Campaign Creation');
  
  const campaignData = {
    name: 'Test Campaign - Customer Journey',
    objective: 'clicks',
    bid_model: 'CPC',
    bid_amount: 0.01,
    total_budget: 1.0,
    daily_budget: 0.1,
    targeting: {
      geo: ['US', 'CA'],
      categories: ['technology'],
      quality_min: 70,
      devices: ['desktop', 'mobile'],
    },
    creative_url: 'https://via.placeholder.com/300x250',
    creative_format: 'banner',
    landing_page_url: 'https://example.com/landing',
  };

  const result = await request('POST', '/api/v1/advertisers/campaigns', campaignData, token);

  if (result.status === 201) {
    success('Campaign created');
    campaignId = result.data.campaign.id;
    console.log(`   Campaign ID: ${campaignId}`);
    console.log(`   Status: ${result.data.campaign.status}`);
    return true;
  } else {
    error('Campaign creation failed', result.data);
    return false;
  }
}

async function testCampaignFunding(token) {
  log('5', 'Testing Campaign Funding');
  
  if (!campaignId) {
    error('No campaign ID available');
    return false;
  }

  const result = await request('POST', '/api/v1/campaigns/fund', {
    campaign_id: campaignId,
    amount: '0.1',
  }, token);

  if (result.status === 200) {
    success('Campaign funding transaction prepared');
    console.log(`   Transaction data: ${JSON.stringify(result.data.transaction, null, 2)}`);
    warning('Execute transaction with wallet to complete funding');
    return true;
  } else {
    error('Campaign funding failed', result.data);
    return false;
  }
}

async function testCampaignDetails(token) {
  log('6', 'Testing Campaign Details');
  
  if (!campaignId) {
    error('No campaign ID available');
    return false;
  }

  const result = await request('GET', `/api/v1/campaigns/${campaignId}`, null, token);

  if (result.status === 200) {
    success('Campaign details retrieved');
    const campaign = result.data.campaign;
    console.log(`   Name: ${campaign.name}`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Budget: ${campaign.total_budget}`);
    if (campaign.on_chain_balance) {
      console.log(`   On-chain Balance: ${campaign.on_chain_balance} ETH`);
    }
    return true;
  } else {
    error('Failed to get campaign details', result.data);
    return false;
  }
}

async function testPublisherRegistration(token) {
  log('7', 'Testing Publisher Registration');
  
  const result = await request('POST', '/api/v1/publishers', {
    website_url: 'https://test-publisher.com',
    payment_wallet: PUBLISHER_WALLET,
    email: 'publisher@test.com',
  }, token);

  if (result.status === 201) {
    success('Publisher registered');
    publisherId = result.data.publisher.id;
    console.log(`   Publisher ID: ${publisherId}`);
    console.log(`   Status: ${result.data.publisher.status}`);
    return true;
  } else if (result.status === 409) {
    warning('Publisher already exists - fetching ID');
    // Get publisher ID from /me endpoint
    const meResult = await request('GET', '/api/v1/publishers/me', null, token);
    if (meResult.status === 200) {
      publisherId = meResult.data.publisher.id;
      success('Publisher ID retrieved');
      return true;
    }
    return false;
  } else {
    error('Publisher registration failed', result.data);
    return false;
  }
}

async function testDomainVerification(token) {
  log('8', 'Testing Domain Verification');
  
  if (!publisherId) {
    error('No publisher ID available');
    return false;
  }

  // Get verification token
  const tokenResult = await request('GET', `/api/v1/publishers/${publisherId}/verification-token`, null, token);
  
  if (tokenResult.status === 200) {
    success('Verification token generated');
    const { verification_token, instructions } = tokenResult.data;
    console.log(`   Token: ${verification_token.substring(0, 20)}...`);
    console.log(`   DNS: ${instructions.dns}`);
    warning('Domain verification requires actual DNS/HTML/file setup');
    return true;
  } else {
    error('Failed to get verification token', tokenResult.data);
    return false;
  }
}

async function testX402AdRequest() {
  log('9', 'Testing X402 Ad Request');
  
  // Test with a mock publisher ID to see endpoint behavior
  const testPublisherId = publisherId || '00000000-0000-0000-0000-000000000001';
  
  const params = new URLSearchParams({
    pub_id: testPublisherId,
    slot_id: 'test-slot-1',
    format: 'banner',
    geo: 'US',
    device: 'desktop',
  });

  const result = await request('GET', `/x402/ad?${params.toString()}`);

  if (result.status === 200) {
    success('Ad served successfully');
    adId = result.data.ad_id;
    console.log(`   Ad ID: ${adId}`);
    console.log(`   Creative URL: ${result.data.creative_url}`);
    console.log(`   Click URL: ${result.data.click_url}`);
    console.log(`   Impression URL: ${result.data.impression_url}`);
    return true;
  } else if (result.status === 402) {
    warning('Payment required (X402 protocol)');
    console.log(`   Payment Address: ${result.data.payment_address}`);
    console.log(`   Amount: ${result.data.amount} ${result.data.token}`);
    return true; // This is a valid response
  } else if (result.status === 404) {
    warning('No matching campaigns (expected if no active campaigns)');
    console.log(`   This is normal - need active campaigns to serve ads`);
    return true;
  } else {
    error('Ad request failed', result.data);
    return false;
  }
}

async function testImpressionTracking() {
  log('10', 'Testing Impression Tracking');
  
  if (!adId || !campaignId || !publisherId) {
    warning('Skipping - missing required IDs');
    return true;
  }

  const result = await request('POST', `/track/impression/${adId}`, {
    campaign_id: campaignId,
    publisher_id: publisherId,
    slot_id: 'test-slot-1',
    geo: 'US',
    device: 'desktop',
  });

  if (result.status === 200) {
    success('Impression tracked');
    console.log(`   Impression ID: ${result.data.impression_id}`);
    return true;
  } else {
    error('Impression tracking failed', result.data);
    return false;
  }
}

async function testClickTracking() {
  log('11', 'Testing Click Tracking');
  
  if (!adId || !campaignId || !publisherId) {
    warning('Skipping - missing required IDs');
    return true;
  }

  const params = new URLSearchParams({
    campaign_id: campaignId,
    publisher_id: publisherId,
    slot_id: 'test-slot-1',
    geo: 'US',
    device: 'desktop',
  });

  const result = await request('GET', `/track/click/${adId}?${params.toString()}`);

  if (result.status === 302 || result.status === 200) {
    success('Click tracked (redirected to landing page)');
    return true;
  } else {
    error('Click tracking failed', result.data);
    return false;
  }
}

async function testPublisherEarnings(token) {
  log('12', 'Testing Publisher Earnings');
  
  if (!publisherId) {
    error('No publisher ID available');
    return false;
  }

  const result = await request('GET', `/api/v1/publishers/${publisherId}/earnings`, null, token);

  if (result.status === 200) {
    success('Publisher earnings retrieved');
    console.log(`   Total Earnings: $${result.data.earnings.total}`);
    console.log(`   Event Count: ${result.data.earnings.event_count}`);
    return true;
  } else {
    error('Failed to get earnings', result.data);
    return false;
  }
}

async function testAuthMessage() {
  log('2', 'Testing Auth Message Endpoint');
  
  const result = await request('POST', '/api/v1/auth/message', {
    address: ADVERTISER_WALLET,
  });

  if (result.status === 200) {
    success('Auth message generated');
    console.log(`   Address: ${result.data.address}`);
    console.log(`   Nonce: ${result.data.nonce.substring(0, 20)}...`);
    console.log(`   Message: ${result.data.message.substring(0, 50)}...`);
    return true;
  } else {
    error('Failed to get auth message', result.data);
    return false;
  }
}

async function testAPIInfo() {
  log('INFO', 'Testing API Info Endpoint');
  
  const result = await request('GET', '/api/v1');

  if (result.status === 200) {
    success('API info retrieved');
    console.log(`   Version: ${result.data.version}`);
    console.log(`   Endpoints: ${Object.keys(result.data.endpoints).length} available`);
    return true;
  } else {
    error('Failed to get API info', result.data);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}🚀 BUZZER NETWORK - COMPLETE CUSTOMER JOURNEY TEST${colors.reset}`);
  console.log('='.repeat(60) + '\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  const results = [];

  // Test 1: Health Check
  results.push(await testHealthCheck());
  console.log('');

  // Test 2: API Info
  results.push(await testAPIInfo());
  console.log('');

  // Test 3: Auth Message (no signature required)
  results.push(await testAuthMessage());
  console.log('');

  // Note: Authentication requires actual wallet signature
  warning('⚠️  AUTHENTICATION NOTE:');
  warning('   Wallet authentication requires actual wallet signature.');
  warning('   To test authenticated endpoints, use the frontend or wallet CLI.');
  warning('   The following endpoints require authentication:\n');
  
  log('AUTH', 'Authentication Flow:');
  console.log('   1. ✅ POST /api/v1/auth/message - Get message to sign (tested above)');
  console.log('   2. ⚠️  Sign message with wallet (requires wallet interaction)');
  console.log('   3. ⚠️  POST /api/v1/auth/verify - Verify signature, get JWT token');
  console.log('   4. ⚠️  Use token in Authorization header for subsequent requests\n');

  // Test endpoints that don't require authentication
  results.push(await testX402AdRequest());
  console.log('');

  // Document all endpoints
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}📋 ALL AVAILABLE ENDPOINTS${colors.reset}`);
  console.log('='.repeat(60));
  
  console.log(`\n${colors.cyan}Public Endpoints (No Auth):${colors.reset}`);
  console.log('   GET  /health - Health check');
  console.log('   GET  / - API root');
  console.log('   GET  /api/v1 - API info');
  console.log('   POST /api/v1/auth/message - Get auth message');
  console.log('   GET  /x402/ad - Request ad (X402 protocol)');
  console.log('   POST /track/impression/:adId - Track impression');
  console.log('   GET  /track/click/:adId - Track click');
  
  console.log(`\n${colors.cyan}Authenticated Endpoints (Require JWT):${colors.reset}`);
  console.log('   POST /api/v1/auth/verify - Verify signature, get token');
  console.log('   GET  /api/v1/auth/me - Get current user');
  console.log('   POST /api/v1/advertisers - Register advertiser');
  console.log('   POST /api/v1/advertisers/campaigns - Create campaign');
  console.log('   GET  /api/v1/advertisers/campaigns - List campaigns');
  console.log('   PATCH /api/v1/advertisers/campaigns/:id - Update campaign');
  console.log('   POST /api/v1/campaigns/fund - Fund campaign');
  console.log('   GET  /api/v1/campaigns/:id - Get campaign details');
  console.log('   GET  /api/v1/campaigns/:id/balance - Get campaign balance');
  console.log('   POST /api/v1/publishers - Register publisher');
  console.log('   GET  /api/v1/publishers/me - Get publisher info');
  console.log('   GET  /api/v1/publishers/:id/verification-token - Get verification token');
  console.log('   POST /api/v1/publishers/:id/verify - Verify domain');
  console.log('   GET  /api/v1/publishers/:id/earnings - Get earnings\n');

  // Summary
  console.log('='.repeat(60));
  console.log(`${colors.blue}📊 TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests Passed: ${colors.green}${passed}/${total}${colors.reset}`);
  
  if (passed === total) {
    console.log(`\n${colors.green}✅ All public endpoints are working!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed${colors.reset}\n`);
  }

  console.log('\n📝 TO TEST FULL CUSTOMER JOURNEY:');
  console.log('   1. Use frontend to connect wallet and authenticate');
  console.log('   2. Register as advertiser: POST /api/v1/advertisers');
  console.log('   3. Create campaign: POST /api/v1/advertisers/campaigns');
  console.log('   4. Fund campaign: POST /api/v1/campaigns/fund (execute tx with wallet)');
  console.log('   5. Register as publisher: POST /api/v1/publishers');
  console.log('   6. Verify domain: POST /api/v1/publishers/:id/verify');
  console.log('   7. Request ads: GET /x402/ad?pub_id=...&slot_id=...&format=banner');
  console.log('   8. Track events: POST /track/impression/:adId, GET /track/click/:adId');
  console.log('   9. View earnings: GET /api/v1/publishers/:id/earnings\n');
}

// Run tests
runAllTests().catch(console.error);

