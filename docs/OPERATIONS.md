# Operations & Administration Guide

Practical reference for day‑to‑day platform administration: user management, trials, subscriptions, maintenance, backups, monitoring, and routine scripts.

---
## 1. Environment Variables Checklist
Essential (must set in production):
- `SECRET_KEY` – Strong random 50+ chars
- `DEBUG` – `false`
- `DATABASE_URL` – Postgres (e.g. `postgres://user:pass@host:5432/db`)
- `ALLOWED_HOSTS` – Comma list of domains (e.g. `app.vendora.page`)
- `CSRF_TRUSTED_ORIGINS` – Comma list with scheme (e.g. `https://app.vendora.page`)
- `TELEGRAM_BOT_TOKEN` – Bot token if using Telegram integration
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` – For web push (if enabled)
- `FRONTEND_URL` – Public PWA origin (e.g. `https://app.vendora.page`)
- `TRIAL_DAYS` – Integer number of free trial days (default 14)

Optional:
- `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`
- `LOG_JSON` (default true) / `LOG_LEVEL`
- `ORDER_AUTO_EXPIRE_MINUTES` (default 30)

Validation Script (planned): see future `env_check.py` (Task #34).

---
## 2. User & Trial Lifecycle
Creation (signup):
- Registration sets `trial_started_at` + `trial_expires_at = now + TRIAL_DAYS` if `is_trial=True`.
- Vendor gating in orders: expired trial blocks creating / accepting orders.

Expiry Handling:
- Command: `python manage.py expire_licenses` (Task #5 complete)
  - Disables `is_service_active` for expired trials & paid plans.
- Run hourly (cron or platform scheduler). Example cron (Linux):
```
0 * * * * /path/to/venv/bin/python /app/backend/manage.py expire_licenses >> /var/log/expire_licenses.log 2>&1
```

Manual Actions (Django Admin > Vendors):
- Start 5-day trial
- Activate Monthly / Yearly / Perpetual
- Revoke Service
- Generate external IDs

### Password Reset Oversight
- Ensure SMTP credentials remain valid; expired credentials surface as 500 errors on `/api/v1/accounts/password-reset/`.
- Monitor email deliverability (SPF/DKIM) so reset links land in inbox. Consider enabling DMARC reports.
- If a user reports a missing email, confirm the token exists in Django admin under **Accounts → Password resets** and resend via `POST /api/v1/accounts/password-reset/`.
- Tokens are single-use; if the vendor loads an expired link, advise them to restart the flow.

### Push Notification Health Checks
- Confirm VAPID keypair values are configured in each environment; rotate if leaked.
- Monthly, run `POST /api/v1/notifications/test-push/` from an authenticated session and confirm the browser receives the alert.
- Review **Notifications → Push subscriptions** for stale rows; the system auto-prunes invalid endpoints after WebPush errors, but manual cleanup keeps the list tidy.
- If vendors stop receiving push alerts, inspect logs for `WebPushException` entries (often caused by missing HTTPS or misconfigured proxy headers).

---
## 3. Key Management Commands
| Command | Purpose |
|---------|---------|
| `python manage.py expire_licenses` | Disable vendors with expired trial/subscription |
| `python manage.py setup_test_data` | Create demo/sample vendor + data (partial demo) |
| `python manage.py backfill_vendor_ids` | Generate missing external vendor IDs |

Planned (future tasks):
- `python manage.py create_demo_dataset` (Task #21)
- `python manage.py export_metrics` or `/metrics` endpoint (Task #17)
- `python manage.py env_check` (Task #34)

---
## 4. Backups
Database (Neon Postgres):
- Prefer provider automated backups + retention.
- On-demand logical dump:
```
pg_dump --no-owner --format=custom "$DATABASE_URL" > vendora_$(date +%Y%m%d_%H%M).dump
```
Or use provided scripts (auto timestamp + retention):
- Windows PowerShell: `powershell -ExecutionPolicy Bypass -File backend/scripts/backup_database.ps1 -Retention 10`
- Unix/macOS: `DATABASE_URL=postgres://... RETENTION=10 bash backend/scripts/backup_database.sh`

Restore:
```
pg_restore --clean --no-owner --dbname "$DATABASE_URL" path/to/dumpfile.dump
```

Media (if any uploaded avatars/proofs):
- Current config stores on local filesystem `backend/media/`.
- Production: mount persistent volume or move to S3-compatible storage.
- Simple rsync/archive (example):
```
zip -r media_backup_$(date +%Y%m%d_%H%M).zip media/
```

Suggested Schedule:
- Daily automated DB dump (retain 7–14)
- Weekly media archive

---
## 5. Monitoring & Health
Endpoints:
- `/health/` – Full DB connectivity & meta info
- `/healthz/` – Lightweight status

Recommended External Services (Task #16):
- Healthchecks.io: wrap `expire_licenses` cron and ping URL
- BetterStack / UptimeRobot: probe `/healthz/`
- Sentry: error aggregation

Alert Thresholds:
- >2 consecutive health failures
- Sustained 5xx rate > 2% over 5 min

---
## 6. Logs & Correlation
- Structured JSON logs (default). Contains `level`, `logger`, `message`, `time`.
- Request ID middleware injects `X-Request-ID` header and env var `REQUEST_ID` for correlation.
- Include request ID when filing issues or tracing errors.

Rotation: Rely on host platform (systemd journald / log shipping) or add a log forwarder.

---
## 7. Security Practices
Immediate:
- Ensure `DEBUG=false` in production.
- Restrict `ALLOWED_HOSTS` to real domains.
- Use HTTPS (platform / reverse proxy) + HSTS (already configured when DEBUG=false).

Upcoming Hardening (Task #13):
- Add Content-Security-Policy (script-src 'self' ...)
- Add Referrer-Policy, Permissions-Policy, X-Frame-Options, X-Content-Type-Options.

Credential Hygiene:
- Rotate Telegram bot token if leaked.
- Store secrets in platform secret manager.

---
## 8. Capacity & Performance
Baseline Targets (to establish via Task #24):
- P95 API latency < 400ms under light load
- SSE reconnect success < 5s typical

Scale Tips:
- Move to dedicated Postgres tier when connections > 50
- Add caching layer for rate lists / read-most endpoints if needed

---
## 9. Planned Feature Ops Notes
Announcements (Task #18): model will allow vendor broadcast with scheduling & audit.
Vendor Success Dashboard (Task #20): aggregate orders (today), completion %, avg processing time.
Analytics (Task #9): plan for event table w/ hashed identifiers.

---
## 10. Incident Response Cheat Sheet
1. Confirm issue via `/health/` & logs.
2. Identify scope (single vendor vs platform).
3. Capture recent deploy changes.
4. Mitigate (rollback, disable feature flag, scale DB).
5. Post-mortem: record timeline, root cause, remediation tasks.

Severity Guidelines:
- SEV1: Full outage / critical data corruption
- SEV2: Majority feature degradation (orders failing)
- SEV3: Minor feature impaired (broadcast send delay)

---
## 11. Data Deletion & Retention (Task #31)
Current: No automatic purge. Manual removal via admin or future command.
Planned: Add retention policy doc + purge script for stale push subscriptions & logs.

---
## 12. Quick Reference Commands
```
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run test suite
pytest -q

# Expire licenses (trials & subs)
python manage.py expire_licenses

# Run backup scripts
powershell -ExecutionPolicy Bypass -File backend/scripts/backup_database.ps1 -Retention 7
DATABASE_URL=postgres://... bash backend/scripts/backup_database.sh

# Generate sample data (when implemented)
python manage.py create_demo_dataset

# Export logical DB dump (depends on environment tooling)
pg_dump --no-owner --format=custom "$DATABASE_URL" > vendora_dump.dump
```

---
## 13. Change Log Process (Task #19)
- Maintain `CHANGELOG.md` with Keep-a-Changelog style.
- Update on each deploy: Added / Changed / Fixed / Security.

---
## 14. Roadmap Traceability
Link tasks (#IDs from internal list) in PR descriptions for historical tracing.

---
*Document status: Initial draft. Expand as tasks 9, 13, 17, 18, 19, 20, 21, 24, 31, 34 complete.*
