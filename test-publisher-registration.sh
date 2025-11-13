#!/bin/bash

# Test Publisher Registration Endpoint
# Usage: ./test-publisher-registration.sh YOUR_WALLET_ADDRESS YOUR_JWT_TOKEN

WALLET_ADDRESS=${1:-"0x1111111111111111111111111111111111111111"}
TOKEN=${2:-""}

echo "🧪 Testing Publisher Registration"
echo "=================================="
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ Error: JWT token required"
  echo "Usage: ./test-publisher-registration.sh WALLET_ADDRESS JWT_TOKEN"
  echo ""
  echo "To get a token:"
  echo "1. Connect wallet in frontend"
  echo "2. Check browser localStorage for 'auth_token'"
  exit 1
fi

echo "📝 Testing registration with:"
echo "   Wallet: $WALLET_ADDRESS"
echo "   Website: https://example.com"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/v1/publishers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "website_url": "https://example.com",
    "email": "test@example.com",
    "payment_wallet": "'"$WALLET_ADDRESS"'"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response Code: $HTTP_CODE"
echo ""
echo "Response Body:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Registration successful!"
elif [ "$HTTP_CODE" = "409" ]; then
  echo "⚠️  Publisher already exists"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Unauthorized - Check your token"
else
  echo "❌ Registration failed"
fi

