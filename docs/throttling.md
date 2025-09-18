# Throttling & Abuse Protection

This document explains how Vendora rate limiting (Task 14) is structured, how to tune it with environment variables, and when each scope is counted.

## Scope Overview
Vendora uses several DRF `SimpleRateThrottle` derivatives with **independent cache keys** so one hot path cannot prematurely consume quota for another.

| Scope | Applies To | Default (env backed) | Env Variable | Notes |
|-------|------------|----------------------|--------------|-------|
| `anon` | Any unauthenticated request | `60/min` | `THROTTLE_ANON` | Basic ceiling for public scraping / probing |
| `user_trial` | Authenticated trial users | (falls back to `THROTTLE_TRIAL_USER` or else `THROTTLE_USER`) | `THROTTLE_TRIAL_USER` | Only used when `request.user.is_trial` is truthy |
| `user` | Authenticated non‑trial users | `240/min` | `THROTTLE_USER` | General per‑user ceiling |
| `order_write` | Order accept / decline (write methods) | `30/min` (prod tighten) | `THROTTLE_ORDER_WRITE` | Prevent rapid transactional flipping |
| `rate_write` | Creating/updating/deleting vendor rates | `15/min` | `THROTTLE_RATES_WRITE` | Rate changes are infrequent; conservative |
| `auth_burst` | Token obtain endpoints (`/token` or `/token/`) | `20/min` | `THROTTLE_AUTH_BURST` | Dampens brute force login/signup attempts |

## Trial vs Regular Users
Vendora separates trial and non‑trial users with two throttle classes instead of a single dynamic class:

- `TrialUserRateThrottle` (scope `user_trial`) applies only when `user.is_trial` is true.
- `RegularUserRateThrottle` (scope `user`) applies to authenticated users that are not trial users.

If `user_trial` is not explicitly listed in `DEFAULT_THROTTLE_RATES`, it falls back to `THROTTLE_TRIAL_USER`, then to the `user` rate. You can ship initially with only `THROTTLE_USER` and later add a lower trial ceiling by defining `THROTTLE_TRIAL_USER` or adding a `user_trial` mapping.

## Environment Variable Mapping
Environment variables are read in `settings.py` when constructing `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']`:

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'vendora.throttling.TrialUserRateThrottle',
        'vendora.throttling.RegularUserRateThrottle',
        'vendora.throttling.OrderWriteScopedThrottle',
        'vendora.throttling.RateWriteScopedThrottle',
        'vendora.throttling.AuthBurstScopedThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon':       env('THROTTLE_ANON', default='60/min'),
        'user':       env('THROTTLE_USER', default='240/min'),
        'order_write': env('THROTTLE_ORDER_WRITE', default='30/min'),
        'rate_write':  env('THROTTLE_RATES_WRITE', default='15/min'),
        'auth_burst':  env('THROTTLE_AUTH_BURST', default='20/min'),
        # optional: 'user_trial': env('THROTTLE_TRIAL_USER')
    }
}
```

If you add `'user_trial': '120/min'` (or define `THROTTLE_TRIAL_USER=120/min`) trial users immediately receive the lower limit with no code changes.

## Cache Key Strategy
All throttles use a key pattern compatible with DRF's default cache format: `throttle:<scope>:<ident>`.

- For authenticated users: `ident = user:<pk>`
- For anonymous users: IP address (DRF's `get_ident`), respecting proxy headers if configured elsewhere.

Because each custom throttle class uses a **fixed, distinct scope**, consuming one (e.g., `rate_write`) does not reduce capacity for another (e.g., `user`). This avoids the leakage problem seen when using `ScopedRateThrottle` with multiple classes pointing at the same view scope.

## When a Request Increments Each Scope
| Scope | Increment Condition |
|-------|---------------------|
| anon | Any request before authentication where user not logged in |
| user / user_trial | Any request after authentication (all methods) |
| order_write | Order mutation endpoints (accept/decline) with non‑safe HTTP methods |
| rate_write | Rate create/update/delete endpoints (non‑safe methods) |
| auth_burst | Request path ends with `/token` or `/token/` (login / obtain token) |

Safe (read-only) methods (`GET`, `HEAD`, `OPTIONS`) are ignored by the write-scoped throttles.

## Tuning Guidance
Start conservatively; raise ceilings only after observing real traffic patterns.

Suggested production starting points (adjust per business scale):
```
THROTTLE_ANON=60/min
THROTTLE_USER=240/min
THROTTLE_TRIAL_USER=120/min
THROTTLE_ORDER_WRITE=10/min
THROTTLE_RATES_WRITE=5/min
THROTTLE_AUTH_BURST=10/min
```

## Observability & Debugging
In `DEBUG` mode the custom `_FixedScopeThrottle` attaches a header-like marker inside `request.META` (`HTTP_X_DEBUG_THROTTLE_<SCOPE>`) noting `ALLOWED` or `THROTTLED`. You can surface these in logs or tests to confirm which limiter fired.

For live environments:
1. Emit 429 counts to metrics (future enhancement: add a DRF exception hook or custom logger filter).
2. Track per-scope denial rates; sustained high denial on `auth_burst` may indicate credential stuffing attempts.

## Extending
To add a new scope:
1. Create a subclass of `_FixedScopeThrottle` with a unique `scope` value.
2. Add it to `DEFAULT_THROTTLE_CLASSES`.
3. Provide an environment variable and default mapping entry.
4. (Optional) Write targeted tests similar to existing ones in `backend/tests/test_throttling.py`.

Avoid reintroducing `ScopedRateThrottle` for shared scopes unless you fully understand and accept the potential collision side effects.

## Future Ideas
- Sliding window or token bucket algorithm (Redis / leaky bucket) for smoother distribution.
- Per-IP + per-user composite keys for sensitive operations.
- Admin UI surface to inspect current counters or temporarily lift limits.
- Automatic temporary ban after repeated `auth_burst` exhaustion.

---
See also: `docs/environment.md` (environment matrix) and the main `README.md` Feature Overview.
