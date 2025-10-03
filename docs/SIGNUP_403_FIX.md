# Fix for Signup 403 Forbidden Error

## Problem
Users with expired trial accounts were getting a 403 Forbidden error when trying to create a new account (signup). This happened because:

1. The user's old JWT token was still stored in localStorage
2. The frontend's http client (axios) automatically adds Authorization headers to ALL requests if a token exists
3. The AccountStatusMiddleware authenticated the JWT token and found the account was expired
4. The middleware was supposed to check an allowlist to exempt auth endpoints, but the path matching was not working correctly

## Root Cause
The `AccountStatusMiddleware.ALLOW_PATH_SUFFIXES` set only included paths with trailing slashes:
```python
ALLOW_PATH_SUFFIXES = {"/api/v1/accounts/signup/", ...}
```

However, depending on the client, proxy configuration, or Django's URL normalization, requests might arrive with or without trailing slashes. The `path.endswith()` check would fail for paths without trailing slashes.

## Solution
Updated the allowlist to include both variants (with and without trailing slashes):
```python
ALLOW_PATH_SUFFIXES = {
    "/api/v1/accounts/token/", "/api/v1/accounts/token",
    "/api/v1/accounts/signup/", "/api/v1/accounts/signup",
    "/api/v1/accounts/password-reset/", "/api/v1/accounts/password-reset",
    "/api/v1/accounts/password-reset/confirm/", "/api/v1/accounts/password-reset/confirm",
    "/api/v1/accounts/token/refresh/", "/api/v1/accounts/token/refresh"
}
```

Also added the missing `/api/v1/accounts/token/refresh/` endpoint which should also bypass account status checks.

## Testing
Added comprehensive tests in `backend/accounts/tests.py` that verify:
- Signup works even when an expired account JWT token is present in the request
- Password reset works with expired tokens
- Token refresh works for expired accounts (needed for proper logout)
- Both trailing slash and non-trailing slash variants are handled

## Impact
- Users with expired trial accounts can now create new accounts
- Users with expired accounts can reset their passwords
- Users with expired accounts can still refresh their tokens (for logout functionality)

## Files Changed
- `backend/vendora/settings.py` - Updated AccountStatusMiddleware.ALLOW_PATH_SUFFIXES
- `backend/accounts/tests.py` - Added tests for middleware allowlist behavior
