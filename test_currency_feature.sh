#!/bin/bash

# Comprehensive test script for currency feature

echo "========================================"
echo "Vendora Currency Feature Test Suite"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "1. Backend Model Tests"
echo "---------------------"

# Test 1: Check migration file exists
if [ -f "backend/accounts/migrations/0021_vendor_currency.py" ]; then
    print_result 0 "Migration file created for currency field"
else
    print_result 1 "Migration file not found"
fi

# Test 2: Check model has CURRENCY_CHOICES
if grep -q "CURRENCY_CHOICES" backend/accounts/models.py; then
    print_result 0 "CURRENCY_CHOICES defined in Vendor model"
else
    print_result 1 "CURRENCY_CHOICES not found in model"
fi

# Test 3: Check get_currency_symbol method exists
if grep -q "def get_currency_symbol" backend/accounts/models.py; then
    print_result 0 "get_currency_symbol() method exists"
else
    print_result 1 "get_currency_symbol() method not found"
fi

# Test 4: Check currency field in serializer
if grep -q '"currency"' backend/accounts/serializers.py; then
    print_result 0 "Currency field added to VendorSerializer"
else
    print_result 1 "Currency not in serializer fields"
fi

# Test 5: Check currency validator in serializer
if grep -q "def validate_currency" backend/accounts/serializers.py; then
    print_result 0 "Currency validator added to serializer"
else
    print_result 1 "Currency validator not found"
fi

echo ""
echo "2. Backend Bot Handler Tests"
echo "----------------------------"

# Test 6: Check bot_handlers updated for currency
if grep -q "get_currency_symbol" backend/api/bot_handlers.py; then
    print_result 0 "Bot handlers updated to use currency symbols"
else
    print_result 1 "Bot handlers not updated for currency"
fi

# Test 7: Check handle_order_preview uses currency
if grep -q "currency_symbol\|vendor_currency" backend/api/bot_handlers.py; then
    print_result 0 "Order preview uses vendor currency"
else
    print_result 1 "Order preview not using currency"
fi

# Test 8: Check handle_asset_selection uses currency
if grep -q "from accounts.models import Vendor" backend/api/bot_handlers.py; then
    print_result 0 "Asset selection imports Vendor for currency"
else
    print_result 1 "Asset selection not importing Vendor"
fi

echo ""
echo "3. Frontend Library Tests"
echo "------------------------"

# Test 9: Check currency utility file exists
if [ -f "frontend/src/lib/currency.ts" ]; then
    print_result 0 "Currency utilities library created"
else
    print_result 1 "Currency utilities not found"
fi

# Test 10: Check formatCurrency function exists
if grep -q "export function formatCurrency" frontend/src/lib/currency.ts; then
    print_result 0 "formatCurrency function exported"
else
    print_result 1 "formatCurrency function not found"
fi

# Test 11: Check getCurrencyOptions function exists
if grep -q "export function getCurrencyOptions" frontend/src/lib/currency.ts; then
    print_result 0 "getCurrencyOptions function exported"
else
    print_result 1 "getCurrencyOptions function not found"
fi

echo ""
echo "4. Frontend Page Updates"
echo "-----------------------"

# Test 12: Check Dashboard imports currency
if grep -q "import.*formatCurrency.*currency" frontend/src/pages/Dashboard.tsx; then
    print_result 0 "Dashboard imports formatCurrency"
else
    print_result 1 "Dashboard not importing formatCurrency"
fi

# Test 13: Check Orders page imports currency
if grep -q "import.*formatCurrency" frontend/src/pages/Orders.tsx && grep -q "useAuth" frontend/src/pages/Orders.tsx; then
    print_result 0 "Orders page uses formatCurrency and auth"
else
    print_result 1 "Orders page not properly updated"
fi

# Test 14: Check Transactions page uses currency
if grep -q "formatCurrency" frontend/src/pages/Transactions.tsx; then
    print_result 0 "Transactions page uses formatCurrency"
else
    print_result 1 "Transactions page not using formatCurrency"
fi

# Test 15: Check TransactionDetails uses currency
if grep -q "formatCurrency" frontend/src/pages/TransactionDetails.tsx; then
    print_result 0 "TransactionDetails uses formatCurrency"
else
    print_result 1 "TransactionDetails not using formatCurrency"
fi

# Test 16: Check OrderDetails uses currency
if grep -q "formatCurrency" frontend/src/pages/OrderDetails.tsx; then
    print_result 0 "OrderDetails uses formatCurrency"
else
    print_result 1 "OrderDetails not using formatCurrency"
fi

echo ""
echo "5. Settings Page Updates"
echo "-----------------------"

# Test 17: Check Settings imports currency utilities
if grep -q "getCurrencyOptions" frontend/src/pages/Settings.tsx; then
    print_result 0 "Settings imports getCurrencyOptions"
else
    print_result 1 "Settings not importing currency options"
fi

# Test 18: Check currency state in Settings
if grep -q "setCurrency\|currency" frontend/src/pages/Settings.tsx; then
    print_result 0 "Settings has currency state management"
else
    print_result 1 "Settings not managing currency state"
fi

echo ""
echo "6. Service Worker Updates"
echo "------------------------"

# Test 19: Check service worker cache version updated
if grep -q "vendora-cache-v15" frontend/public/sw.js; then
    print_result 0 "Service worker cache version bumped"
else
    print_result 1 "Service worker cache not updated"
fi

echo ""
echo "7. Frontend Auth Types"
echo "---------------------"

# Test 20: Check VendorProfile includes currency
if grep -q "currency.*string" frontend/src/lib/auth.ts; then
    print_result 0 "VendorProfile interface includes currency"
else
    print_result 1 "VendorProfile missing currency type"
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo "Total: $TOTAL"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
