# Testing Documentation

This directory contains test results and testing scripts.

## Test Reports

- **TEST_REPORT.md** - Detailed API endpoint test results
- **ENDPOINT_TEST_SUMMARY.md** - Summary of all endpoint tests
- **CORE_FLOW_TEST_RESULTS.md** - End-to-end user journey flow test results

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

## Test Coverage

- ✅ Health & system endpoints
- ✅ Authentication endpoints
- ✅ X402 ad serving
- ✅ Tracking endpoints
- ✅ Publisher endpoints
- ✅ Advertiser endpoints
- ✅ Campaign endpoints

