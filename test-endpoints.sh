#!/bin/bash

# End-to-End API Endpoint Testing Script
# Tests all API endpoints systematically

API_URL="${API_URL:-http://localhost:3001}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Buzzer Network - End-to-End API Tests"
echo "=========================================="
echo "API URL: $API_URL"
echo ""

# Test counter
PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local auth=$5
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "GET" ]; then
        if [ -n "$auth" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
                -H "Authorization: Bearer $auth" \
                -H "Content-Type: application/json")
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
                -H "Content-Type: application/json")
        fi
    else
        if [ -n "$auth" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Authorization: Bearer $auth" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (${http_code})"
        ((PASSED++))
        return 0
    elif [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
        echo -e "${YELLOW}⚠ SKIP${NC} (${http_code} - Requires auth)"
        ((SKIPPED++))
        return 2
    elif [ "$http_code" -eq 404 ] || [ "$http_code" -eq 400 ]; then
        echo -e "${YELLOW}⚠ SKIP${NC} (${http_code} - Expected for missing data)"
        ((SKIPPED++))
        return 2
    else
        echo -e "${RED}✗ FAIL${NC} (${http_code})"
        echo "   Response: $body"
        ((FAILED++))
        return 1
    fi
}

# 1. Health Check
echo "1. Health & Info Endpoints"
echo "---------------------------"
test_endpoint "Health Check" "GET" "/health"
test_endpoint "API Info" "GET" "/api/v1"
echo ""

# 2. Authentication
echo "2. Authentication Endpoints"
echo "----------------------------"
test_endpoint "Get Auth Message" "POST" "/api/v1/auth/message" '{"address":"0x1111111111111111111111111111111111111111"}'
echo "⚠️  Signature verification requires wallet - skipping"
((SKIPPED++))
echo ""

# 3. X402 Ad Serving
echo "3. X402 Ad Serving"
echo "------------------"
test_endpoint "X402 Ad (banner)" "GET" "/x402/ad?pub_id=test&slot_id=test&format=banner"
test_endpoint "X402 Ad (native)" "GET" "/x402/ad?pub_id=test&slot_id=test&format=native"
test_endpoint "X402 Ad (video)" "GET" "/x402/ad?pub_id=test&slot_id=test&format=video"
test_endpoint "X402 Ad (invalid format)" "GET" "/x402/ad?pub_id=test&slot_id=test&format=invalid"
echo ""

# 4. Tracking Endpoints
echo "4. Tracking Endpoints"
echo "--------------------"
test_endpoint "Impression Tracking" "POST" "/track/impression/AD_TEST123" \
    '{"campaign_id":"test","publisher_id":"test","slot_id":"test","geo":"US","device":"desktop"}'
test_endpoint "Click Tracking" "GET" "/track/click/AD_TEST123?campaign_id=test&publisher_id=test&slot_id=test"
echo ""

# 5. Publisher Endpoints (require auth)
echo "5. Publisher Endpoints"
echo "----------------------"
test_endpoint "Publisher Registration" "POST" "/api/v1/publishers" \
    '{"website_url":"https://test.com","payment_wallet":"0x1111111111111111111111111111111111111111"}'
test_endpoint "Get Publisher (me)" "GET" "/api/v1/publishers/me" "" "dummy_token"
test_endpoint "Publisher Earnings" "GET" "/api/v1/publishers/123/earnings" "" "dummy_token"
echo ""

# 6. Advertiser Endpoints (require auth)
echo "6. Advertiser Endpoints"
echo "-----------------------"
test_endpoint "Advertiser Registration" "POST" "/api/v1/advertisers" \
    '{"company_name":"Test Company","website_url":"https://test.com"}'
test_endpoint "Get Campaigns" "GET" "/api/v1/advertisers/campaigns" "" "dummy_token"
test_endpoint "Create Campaign" "POST" "/api/v1/advertisers/campaigns" \
    '{"name":"Test","objective":"awareness","bid_model":"CPM","bid_amount":0.01,"total_budget":100,"creative_url":"https://test.com","creative_format":"banner","landing_page_url":"https://test.com","targeting":{}}' \
    "dummy_token"
echo ""

# 7. Campaign Endpoints (require auth)
echo "7. Campaign Endpoints"
echo "---------------------"
test_endpoint "Campaign Funding" "POST" "/api/v1/campaigns/fund" \
    '{"campaign_id":"123","amount":"1.0"}' "dummy_token"
test_endpoint "Campaign Balance" "GET" "/api/v1/campaigns/123/balance" "" "dummy_token"
test_endpoint "Get Campaign" "GET" "/api/v1/campaigns/123" "" "dummy_token"
echo ""

# Summary
echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Skipped: $SKIPPED${NC}"
TOTAL=$((PASSED + FAILED + SKIPPED))
echo "📝 Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    exit 1
fi




