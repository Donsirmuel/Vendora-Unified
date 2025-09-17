# Multi-Environment Configuration Checklist

Use this checklist before promoting a new environment (staging or production). Pair this with `docs/environment.md` and the `env_sanity.py` script.

## Legend
- (R) Required – must be set before deploy
- (Rec) Recommended – strongly advised; safe defaults exist
- (Opt) Optional – enable when feature used

## 1. Core & Secrets
- [ ] SECRET_KEY (R) – 50+ chars, high entropy (DO NOT reuse across envs)
- [ ] DEBUG=False (R for prod)
- [ ] ALLOWED_HOSTS includes domain + any API subdomains (R)
- [ ] CSRF_TRUSTED_ORIGINS includes https://<domain> (R)
- [ ] TRIAL_DAYS business-approved (Rec)

## 2. Database
- [ ] DATABASE_URL points to managed Postgres (R)
- [ ] Connection pooling (PgBouncer / RDS) strategy documented (Rec)
- [ ] DB_CONN_MAX_AGE tuned (>0 for pooled, 0 for SQLite dev) (Rec)
- [ ] Backup & retention policy documented (R) – link in OPERATIONS docs

## 3. Caching / Performance (Future)
- [ ] REDIS_URL configured (Opt) – skip if not yet introduced

## 4. Email & Notifications
- [ ] EMAIL_BACKEND set to SMTP backend (R for prod)
- [ ] DEFAULT_FROM_EMAIL uses verified sending domain (R)
- [ ] SPF / DKIM / DMARC configured (R) – external DNS
- [ ] Web Push VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY generated (Rec if push enabled)

## 5. Telegram Bot (If Enabled)
- [ ] TELEGRAM_BOT_TOKEN set (R if feature on)
- [ ] TELEGRAM_WEBHOOK_SECRET random 32+ chars (R)
- [ ] TELEGRAM_WEBHOOK_URL uses https and correct path (R)
- [ ] TELEGRAM_CHAT_ID stored for admin notifications (Rec)

## 6. Security Headers
- [ ] CONTENT_SECURITY_POLICY hardened (no unsafe-inline unless hashed) (R)
- [ ] REFERRER_POLICY set (strict-origin-when-cross-origin or same-origin) (R)
- [ ] PERMISSIONS_POLICY set minimally (camera=(), geolocation=(), microphone=()) (Rec)
- [ ] X_FRAME_OPTIONS DENY (R)

## 7. Observability
- [ ] LOG_LEVEL=INFO (or WARN during quiet periods) (R)
- [ ] LOG_JSON=True for structured logs (Rec)
- [ ] SENTRY_DSN configured (Rec) – if using Sentry
- [ ] SENTRY_TRACES_SAMPLE_RATE modest (e.g. 0.1) (Rec)
- [ ] SENTRY_PROFILES_SAMPLE_RATE small (e.g. 0.01) (Rec)

## 8. Rate Limiting & Abuse (Future Hardening)
- [ ] THROTTLE_* env vars set (anon, user, trial, order_write, rate_write, auth_burst) (Rec)
- [ ] Order write limits tightened vs general user traffic (Rec)
- [ ] Auth burst throttle protects login attempts (Rec)
- [ ] IP allow / deny list strategy documented (Opt)

## 9. Trial & Billing (When Monetizing)
- [ ] Trial length (TRIAL_DAYS) matches pricing page (R)
- [ ] Grace period rules documented (Rec)

## 10. Data & Compliance
- [ ] Privacy policy & terms deployed and linked (R)
- [ ] Data retention schedule documented (Rec)
- [ ] Personal data export path validated (Task 21 pending) (Rec)

## 11. Frontend / CORS
- [ ] FRONTEND_URL matches deployed SPA origin (R)
- [ ] CORS_ALLOWED_ORIGINS exact list (R) – no wildcard in prod
- [ ] CORS_ALLOW_ALL_ORIGINS=False (R)

## 12. Migrations & Bootstrap
- [ ] All migrations applied (R)
- [ ] Superuser created securely (R)
- [ ] Initial feature flags / toggle data loaded (Opt)

## 13. Storage (If / When Introduced)
- [ ] MEDIA storage points to object store (S3, etc.) (Opt)
- [ ] STATIC served via CDN (Rec)

## 14. Scripts & Validation
- [ ] `python env_sanity.py` exits 0 (R)
- [ ] Smoke test script passes (Rec)
- [ ] Disaster recovery drill documented (Rec)

## 15. Final Production Gate
- [ ] Monitoring dashboard link recorded (Rec)
- [ ] On-call / escalation path listed (Rec)
- [ ] Backup restore test completed within last 30 days (Rec)
- [ ] All secrets stored in password manager / vault (R)

---
Append new variables both here and in `docs/environment.md` with classification.
