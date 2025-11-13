# Testing Documentation

This directory contains test results, testing scripts, and testing guides.

## Test Reports

- **ENDPOINT_TEST_SUMMARY.md** - Summary of all endpoint tests (consolidated test report)
- **CORE_FLOW_TEST_RESULTS.md** - End-to-end user journey flow test results
- **PUBLISHER_REGISTRATION_AUDIT.md** - Publisher registration audit results

## Testing Guides

- **TESTING_GUIDE.md** - Step-by-step testing guide for all features
- **CUSTOMER_JOURNEY_ENDPOINTS.md** - Complete customer journey with all endpoints

## Test Scripts

- **test-endpoints.sh** - Basic endpoint testing script
- **test-endpoints-auth.sh** - Authentication flow testing script

## Running Tests

### End-to-End API Tests
```bash
./docs/07_testing/test-endpoints.sh
```

### Authentication Tests
```bash
./docs/07_testing/test-endpoints-auth.sh
```

### Core Flow Tests
```bash
cd packages/backend
npm run test:flow
```

### Customer Journey Tests
```bash
node test-customer-journey.js
```

## Test Coverage

- ✅ Health & system endpoints
- ✅ Authentication endpoints
- ✅ X402 ad serving
- ✅ Tracking endpoints
- ✅ Publisher endpoints
- ✅ Advertiser endpoints
- ✅ Campaign endpoints
- ✅ Complete customer journeys (advertiser & publisher flows)



