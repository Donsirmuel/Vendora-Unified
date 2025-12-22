# Currency Selection Feature Implementation

## Overview
This document describes the implementation of the currency selection feature for the Vendora platform. Vendors can now choose their preferred display currency, which will be shown on their dashboard and Telegram bot instead of the hardcoded Nigerian Naira (₦).

## Changes Made

### Backend Changes

#### 1. **Vendor Model** (`backend/accounts/models.py`)
- **Added**: `currency` field with 12 supported currencies:
  - USD (US Dollar) - **Default**
  - EUR (Euro)
  - GBP (British Pound)
  - JPY (Japanese Yen)
  - AUD (Australian Dollar)
  - CAD (Canadian Dollar)
  - CHF (Swiss Franc)
  - CNY (Chinese Yuan)
  - INR (Indian Rupee)
  - NGN (Nigerian Naira)
  - ZAR (South African Rand)
  - KES (Kenyan Shilling)

- **Added**: `get_currency_symbol()` method that returns the appropriate symbol for each currency

#### 2. **Database Migration** (`backend/accounts/migrations/0021_vendor_currency.py`)
- Created migration to add the `currency` field to the Vendor table
- Default value set to 'USD'

#### 3. **VendorSerializer** (`backend/accounts/serializers.py`)
- **Added**: `currency` field to serialized output
- **Added**: `validate_currency()` method to ensure only valid currencies are accepted
- Vendors can update their currency preference via the API

#### 4. **Bot Handlers** (`backend/api/bot_handlers.py`)
- **Updated**: `handle_order_preview()` to use vendor's selected currency
- **Updated**: `handle_asset_selection()` to fetch vendor's currency and display rates in that currency
- Both functions now display currency symbols based on vendor preference instead of hardcoded ₦

### Frontend Changes

#### 1. **Currency Utilities** (`frontend/src/lib/currency.ts`)
- **New file** with reusable currency formatting functions:
  - `formatCurrency(amount, currencyCode)` - Format amount with currency symbol
  - `getCurrencySymbol(code)` - Get symbol for currency code
  - `getCurrencyName(code)` - Get full name for currency code
  - `getCurrencyOptions()` - Get array of select options
  - `AVAILABLE_CURRENCIES` - Currency constant object

#### 2. **Auth Types** (`frontend/src/lib/auth.ts`)
- **Updated**: `VendorProfile` interface to include optional `currency` field

#### 3. **Settings Page** (`frontend/src/pages/Settings.tsx`)
- **Added**: New "Currency Preferences" settings section
- Users can select from 12 available currencies via dropdown
- Changes are saved automatically when selecting a new currency
- Import of `getCurrencyOptions` for populating currency select

#### 4. **Dashboard Page** (`frontend/src/pages/Dashboard.tsx`)
- **Updated**: Loads user's currency preference on mount
- **Updated**: Revenue display to use user's selected currency instead of hardcoded ₦
- **Updated**: Recent transactions section to use user's currency
- **Updated**: Service worker cache version to v15

#### 5. **Orders Page** (`frontend/src/pages/Orders.tsx`)
- **Updated**: Rate and total value displays to use user's currency
- Uses `formatCurrency()` function from currency utilities

#### 6. **Transactions Page** (`frontend/src/pages/Transactions.tsx`)
- **Updated**: Table header to show selected currency
- **Updated**: Transaction value column to use user's currency

#### 7. **Transaction Details Page** (`frontend/src/pages/TransactionDetails.tsx`)
- **Updated**: Transaction value display to use user's currency

#### 8. **Order Details Page** (`frontend/src/pages/OrderDetails.tsx`)
- **Updated**: Order value display to use user's currency

### Service Worker

#### 1. **Service Worker** (`frontend/public/sw.js`)
- **Updated**: Cache version from v14 to v15
- **Updated**: API cache version from v1 to v2
- This ensures users get the latest cached assets with the new currency feature

## API Changes

### Existing Endpoints Updated

#### GET `/api/v1/accounts/vendors/me/`
- **Response now includes**: `currency` field (default: "USD")

#### PATCH `/api/v1/accounts/vendors/me/`
- **Can now update**: `currency` field
- Example payload: `{"currency": "EUR"}`

## Testing

### Backend Tests (`backend/accounts/test_currency.py`)
Created comprehensive test suite covering:
- ✓ Default currency is USD
- ✓ Currency can be set and retrieved
- ✓ Currency symbols are correctly returned
- ✓ API endpoint includes currency field
- ✓ Currency can be updated via API
- ✓ Invalid currencies are rejected
- ✓ Currency persists across sessions
- ✓ All currency options are available
- ✓ Bot handlers display correct currency

### Frontend Tests (`frontend/src/lib/currency.test.ts`)
Created test suite for utility functions:
- ✓ formatCurrency() works for all currencies
- ✓ getCurrencySymbol() returns correct symbols
- ✓ getCurrencyName() returns correct names
- ✓ getCurrencyOptions() returns proper array structure
- ✓ UI component rendering is compatible

### Verification Script (`test_currency_feature.sh`)
Bash script that verifies all changes:
- ✓ All 20 checks passed
- ✓ Migration file created
- ✓ Models updated
- ✓ Serializers updated
- ✓ Bot handlers updated
- ✓ Frontend utilities created
- ✓ Pages updated
- ✓ Service worker updated

## User Experience

### For Vendors

1. **Initial Setup**: Default currency is USD when account is created
2. **Change Currency**: 
   - Go to Settings → Currency Preferences
   - Select desired currency from dropdown
   - Changes apply immediately
   
3. **Dashboard Display**:
   - All revenue amounts show in selected currency
   - Uses appropriate symbol ($ € £ ¥ etc.)
   - Shows currency code in header (e.g., "Settled revenue (EUR)")

4. **Telegram Bot**:
   - Order previews show rates and totals in vendor's currency
   - Asset selection shows buy/sell rates in vendor's currency
   - No need to manually convert - everything is automatic

### For Customers

1. **No Changes**: Customers see prices in whatever currency the vendor has set
2. **Clear Display**: Each rate and total shows the vendor's currency symbol

## Important Notes

⚠️ **Currency is Display-Only**
- The currency setting only affects the display format
- All backend calculations remain the same
- Vendors must ensure their rates reflect the chosen currency
- Example: If switching from NGN to USD, rates must be adjusted accordingly

## Migration Steps for Deployment

1. **Run Migration**: 
   ```bash
   python manage.py migrate accounts
   ```

2. **Update Frontend Build**:
   - Service worker cache version is automatically updated
   - Browser will fetch new assets

3. **No Data Loss**: 
   - All existing vendors automatically get USD as default
   - Can change anytime from Settings

## Backward Compatibility

- ✓ Existing vendors work seamlessly (default to USD)
- ✓ API remains backward compatible (currency is optional)
- ✓ Database migration is non-destructive
- ✓ No breaking changes to existing endpoints

## Future Enhancements

Possible improvements for future versions:
- Currency conversion API for cross-currency transactions
- Multi-currency support for displaying multiple currencies simultaneously
- Historical currency conversion rates
- Currency change history/audit log
- Automatic currency detection based on vendor location

## Support & Documentation

- Vendors should be notified of the new feature via email
- In-app tutorial or tooltip should explain the feature
- Help documentation should mention that rates need to be adjusted when changing currency
