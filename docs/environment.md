# Environment & Configuration Sanity (Task 34)

This document explains required vs recommended vs optional environment variables and the helper script that validates them before deployment.

## Quick Check
Run the sanity script from the backend directory:

```bash
python env_sanity.py
```

Exit codes:
- 0: All required variables present (warnings may exist)
- 1: Missing / invalid required variables
- 2: Only warnings (recommended variables missing) but no hard failures

Colored table output is shown when stdout is a TTY. Integrate this into CI/CD or your startup script.

## Machine Readable Output
Add `--json` to emit minimal JSON (extend as needed):
```bash
python env_sanity.py --json
```

## Variable Classification
| Variable | Requirement | Purpose |
|----------|-------------|---------|
| SECRET_KEY | required | Django cryptographic signing key |
| DEBUG | required | Toggles debug mode (must be false in prod) |
| ALLOWED_HOSTS | required | Whitelist of allowed hostnames |
| DATABASE_URL | recommended | Production database DSN (falls back to sqlite if absent) |
| DB_CONN_MAX_AGE | optional | Persistent DB connection lifetime |
| TRIAL_DAYS | recommended | Length of free trial in days |
| ORDER_AUTO_EXPIRE_MINUTES | recommended | Default order auto-expire window |
| CORS_ALLOWED_ORIGINS | recommended | Allowed origins for cross-site requests |
| FRONTEND_URL | recommended | Public base URL of frontend |
| EMAIL_BACKEND | recommended | Email backend module path |
| DEFAULT_FROM_EMAIL | recommended | Default from email address |
| EMAIL_HOST | optional | SMTP server host |
| EMAIL_PORT | optional | SMTP port |
| EMAIL_HOST_USER | optional | SMTP username |
| EMAIL_HOST_PASSWORD | optional | SMTP password |
| VAPID_PUBLIC_KEY | recommended | Web Push public key |
| VAPID_PRIVATE_KEY | recommended | Web Push private key |
| VAPID_EMAIL | optional | Contact email in VAPID claims |
| TELEGRAM_BOT_TOKEN | recommended | Telegram bot token |
| TELEGRAM_BOT_USERNAME | recommended | Telegram bot username |
| TELEGRAM_WEBHOOK_URL | optional | Telegram webhook URL |
| TELEGRAM_WEBHOOK_SECRET | optional | Telegram webhook shared secret |
| CONTENT_SECURITY_POLICY | optional | Override default CSP |
| REFERRER_POLICY | optional | Override referrer policy |
| PERMISSIONS_POLICY | optional | Override permissions policy |
| X_FRAME_OPTIONS | optional | Override frame options |
| SENTRY_DSN | optional | Sentry DSN for error tracking |
| SENTRY_TRACES_SAMPLE_RATE | optional | Sentry tracing sample rate |
| SENTRY_PROFILES_SAMPLE_RATE | optional | Sentry profiling sample rate |
| LOG_LEVEL | optional | Root logging verbosity |
| LOG_JSON | optional | Enable JSON formatted logs |
| DB_LOG_LEVEL | optional | Database backend log level |
| THROTTLE_ANON | optional | Anonymous request rate ceiling |
| THROTTLE_USER | optional | Authenticated user base rate ceiling |
| THROTTLE_TRIAL_USER | optional | Trial user rate ceiling (maps to `user_trial` scope) |
| THROTTLE_ORDER_WRITE | optional | Order accept/decline action rate |
| THROTTLE_RATES_WRITE | optional | Rate create/update/delete rate |
| THROTTLE_AUTH_BURST | optional | Auth endpoints (login/signup) burst cap |
| PLAN_DAYS_MONTHLY | optional | Override default monthly plan duration (days) |
| PLAN_DAYS_YEARLY | optional | Override default yearly plan duration (days) |
| METRICS_SECRET | optional | Protect /metrics with X-Metrics-Token header |

## Multi-Environment Matrix (Task 26)

Guidance for typical values across environments. "—" means leave blank (feature not enabled yet or default). Replace examples with real values.

| Variable | Local (dev) | Staging | Production | Notes |
|----------|-------------|---------|------------|-------|
| DEBUG | True | False | False | Never True outside local |
| SECRET_KEY | simple placeholder | strong secret | strong secret | Unique per env |
| ALLOWED_HOSTS | localhost,127.0.0.1 | staging.api.example.com | api.example.com | Include any CDNs if terminating HTTPS there |
| CSRF_TRUSTED_ORIGINS | http://127.0.0.1:8000 | https://staging.example.com | https://example.com | Must be scheme + host |
| DATABASE_URL | — (sqlite) | postgres://.../vendora_stg | postgres://.../vendora | Use managed Postgres |
| DB_CONN_MAX_AGE | 0 | 60 | 120 | Tune for connection pooling |
| TRIAL_DAYS | 14 | 14 | 14 | Sync with pricing page |
| ORDER_AUTO_EXPIRE_MINUTES | 30 | 30 | 30 | Adjust if business rules change |
| CORS_ALLOWED_ORIGINS | http://localhost:5173 | https://staging.example.com | https://example.com | No wildcard in prod |
| FRONTEND_URL | http://localhost:5173 | https://staging.example.com | https://example.com | SPA base origin |
| EMAIL_BACKEND | console backend | SMTP backend | SMTP backend | Console only locally |
| DEFAULT_FROM_EMAIL | noreply@vendora.local | noreply@staging.example.com | noreply@example.com | Must pass SPF/DKIM |
| EMAIL_HOST / PORT | — | smtp.provider.com / 587 | smtp.provider.com / 587 | TLS recommended |
| EMAIL_HOST_USER / PASSWORD | — | service account | service account | Store in secret manager |
| VAPID_PUBLIC_KEY | — or dev key | staging key | production key | Separate keypairs per env |
| VAPID_PRIVATE_KEY | — or dev key | staging key | production key | Keep secret |
| VAPID_EMAIL | admin@example.com | admin@example.com | admin@example.com | Contact URI |
| TELEGRAM_BOT_TOKEN | — (optional) | staging bot token | prod bot token | Separate bots per env |
| TELEGRAM_WEBHOOK_URL | — | https://staging.example.com/api/tg/webhook/ | https://example.com/api/tg/webhook/ | Must match deployed URL |
| TELEGRAM_WEBHOOK_SECRET | — | random secret | random secret | Rotate if leaked |
| CONTENT_SECURITY_POLICY | — | hardened CSP | hardened CSP | Provide explicit script/style sources |
| REFERRER_POLICY | — | strict-origin-when-cross-origin | strict-origin-when-cross-origin | |
| PERMISSIONS_POLICY | — | minimal | minimal | camera=(),microphone=(),geolocation=() |
| X_FRAME_OPTIONS | — | DENY | DENY | |
| SENTRY_DSN | — | staging DSN | prod DSN | Separate projects per env |
| SENTRY_TRACES_SAMPLE_RATE | 0.0 | 0.1 | 0.1 | Adjust for cost/perf |
| SENTRY_PROFILES_SAMPLE_RATE | 0.0 | 0.01 | 0.01 | Lower than traces |
| LOG_LEVEL | INFO | INFO | INFO | Increase to DEBUG only temporarily |
| LOG_JSON | True | True | True | Structured logs for all envs |
| DB_LOG_LEVEL | WARNING | WARNING | WARNING | DEBUG only when diagnosing |
| THROTTLE_ANON | 60/min | 60/min | 60/min | Increase only if necessary |
| THROTTLE_USER | 240/min | 240/min | 240/min | General authenticated ceiling |
| THROTTLE_TRIAL_USER | 120/min | 120/min | 120/min | Provides `user_trial` scope override |
| THROTTLE_ORDER_WRITE | 30/min | 20/min | 10/min | Tighten in production |
| THROTTLE_RATES_WRITE | 15/min | 10/min | 5/min | Rate editing is infrequent |
| THROTTLE_AUTH_BURST | 20/min | 15/min | 10/min | Protect login brute force |
| PLAN_DAYS_MONTHLY | 30 | 30 | 30 | Change only if product pricing shifts |
| PLAN_DAYS_YEARLY | 365 | 365 | 365 | Align with billing cycle |
| METRICS_SECRET | dev-secret | staging-secret | prod-generated | Rotate if leaked |

Add new variables to both classification and this matrix when introduced.

Throttling specifics & scope behavior: see `docs/throttling.md`.

## Suggested CI Step
Add a pipeline step before migrations/server start:
```bash
python backend/env_sanity.py || exit 1
```
(Adjust path if your working directory differs.)

## Extending
Add new variables by editing `backend/env_sanity.py` and appending entries to the `VARIABLES` list. Include a validator for format checks where appropriate.

## Notes
- Only a small subset is truly required to allow flexible local development.
- Recommended items help prevent silent misconfiguration (e.g., missing push keys or trial length).
- You can convert any recommended variable to required by changing its `requirement` value.
