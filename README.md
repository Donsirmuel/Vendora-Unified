<p align="center">
	<img src="frontend/public/icons/icon-192.png" width="72" alt="Vendora" />
</p>

# Vendora – Crypto Vendor Platform

Vendora is an opinionated open core platform for independent OTC / P2P crypto vendors. It bundles real‑time order workflow, rate management, transaction proofs, customer queries, notifications, web push, and a Telegram bot into a single DX‑friendly stack. It is a tool created to eliminate the issues that traditional P2P systems have, it also eliminates the issues of lagging socaial media channels used in communicating with customers by leveraging Telegram bots; Vendors sign up on Vendora, add assets that they trade in along with their rates, add their payment methods and trade instructions, Vendora issues them a unique telegram bot link which they share to their customers, their customers click the link and they are able to trade with their Vendors seamlessly. Vendora ensures that the only thing required of independent vendors is Marketing and establishing their business image as reputable vendors while Vendor ensures that they are reputable by ensuring a productive, swift and effective Transactional system.

## Why Vendora?
| Need | Built‑in Capability |
|------|--------------------|
| Fast vendor onboarding | Automatic trial (configurable `TRIAL_DAYS`) |
| Realtime order + status | Server-Sent Events (SSE) stream `/api/v1/stream/` |
| Proof / transaction audit | Immutable transaction lifecycle + PDF export (future extension) |
| Multi-channel notifications | Web push (VAPID) + Telegram bot hooks |
| Lightweight hosting | No required Docker; works on any basic VM / PaaS |
| Operational clarity | `docs/OPERATIONS.md` + backup scripts |

## Architecture Snapshot
```
backend/   Django 5 + DRF + SimpleJWT (auth, orders, rates, queries, transactions)
frontend/  React 18 + TypeScript + Vite PWA (SSE client, push, offline shell)
api/       Telegram webhook handlers + SSE + exceptions
notifications/ Web push subscription + future email/template expansion
docs/      Operations, development notes
```

Key Integrations:
- JWT auth (access + rotating refresh).
- Throttling: anonymous 60/min, authenticated 120/min.
- Trial gating built into order creation / acceptance.
- Structured JSON logging + request ID header.
- Optional Sentry instrumentation (performance + profiles toggle via env).

- Telegram bot main menu: header now reads "Welcome to Vendor - Youre currently trading with [Vendor username]" to make the active vendor explicit to users.

## Try It Locally (5 Minutes)
```bash
# 1. Backend
cd backend
python -m venv .venv && .venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser --email admin@example.com
python manage.py runserver 0.0.0.0:8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev

# 3. Open
http://localhost:5173 (PWA)  |  http://127.0.0.1:8000/admin (Admin)
```

## Environment Variables (Core)
| Variable | Purpose | Default |
|----------|---------|---------|
| SECRET_KEY | Django secret | dev placeholder |
| DEBUG | Dev mode toggle | true |
| DATABASE_URL | Postgres connection | (empty -> SQLite) |
| TRIAL_DAYS | Free trial length | 14 |
| FRONTEND_URL | Public PWA origin | http://localhost:5173 |
| TELEGRAM_BOT_TOKEN | Bot integration | '' |
| VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY | Web push | '' |
| LOG_JSON | JSON logs toggle | true |
| SENTRY_DSN | Error tracing | '' |

Full operational list and retention recommendations: see `docs/OPERATIONS.md`.

Multi-environment guidance & pre-deploy checklist: see `docs/environment.md` (matrix) and `docs/env-checklist.md`.

## Feature Overview
- Vendor signup → automatic trial start & expiry enforcement.
- Plan upgrade endpoint `/api/v1/accounts/upgrade/` (monthly, yearly, perpetual) with configurable durations.
- Orders: lifecycle with auto-expire fallback (`ORDER_AUTO_EXPIRE_MINUTES`).
- Transactions: state changes (complete / decline) with timestamp audit.
- Rates: unique per vendor & asset pair.
- Queries: simple customer request tracking (mark done).
- SSE stream for reactive UI without heavy polling.
- Web push subscription endpoints & service worker integration.
- Telegram webhook adapter (bot notifications / future commands).
- Security headers (CSP, Referrer-Policy, Permissions-Policy) auto-enabled in production.
- Sitemap + robots for basic SEO surface.
- Granular throttling scopes (anon, user, user_trial, order_write, rate_write, auth_burst) configurable via THROTTLE_* env vars (see `docs/throttling.md`).

## Testing
```bash
cd backend
pytest -q
```
Focus tests include: trial activation, authentication flows, orders gating, transactions, rates uniqueness, queries, SSE snapshot.

## Observability
Health: `/health/` (full) and `/healthz/` (lightweight).
Logging: structured JSON with `X-Request-ID` propagation.
Sentry: enable via `SENTRY_DSN` (opt-in sampling vars supported).
Throttling: refined DRF scopes – adjust `THROTTLE_*` environment variables to tune.
Upcoming (roadmap): metrics endpoint, changelog model, announcements.

## Client Error Handling
The frontend mounts inside a global `ErrorBoundary` (`frontend/src/components/ErrorBoundary.tsx`).
If a render/runtime error occurs in the React tree:
1. A fallback screen appears with the error message (redacted to the message only) and options to Retry (reset boundary state) or Reload (full page refresh).
2. In development (`import.meta.env.DEV`) the stack is logged to the console for fast debugging.

Additionally, failed dynamic import (code-split chunk) loads (often caused by a deploy while a tab is open) trigger a confirmation dialog offering a safe reload to fetch the new assets.

Extend telemetry by wiring Sentry: replace the console call in `ErrorBoundary.componentDidCatch` with `Sentry.captureException` when `SENTRY_DSN` is present.

## SEO & Meta (Task 31)
`frontend/index.html` includes:
- Descriptive title & meta description
- Canonical URL & robots directive
- Open Graph + Twitter Card tags
- JSON-LD `SoftwareApplication` schema
Update these if the marketing site domain changes. Keep description under ~155 chars.

## Accessibility (Task 30)
Implemented baseline a11y support:
- Skip link (`index.html`) to jump directly to `#main-content`.
- Proper landmarks: nav (primary), banner header, and `<main id="main-content">` in `Layout`.
- Focus target on main for immediate keyboard navigation.
- Dashboard loading state announces via `role="status"` + `aria-live="polite"`.
Next steps (future contributions welcome): color contrast audit, form field labels audit, keyboard trap checks, prefers-reduced-motion handling, and screen reader-friendly chart summaries.

## Theme System (Task 29)
Dark/light mode features:
- System preference respected on first load via `prefers-color-scheme`.
- Persistent user override stored in `localStorage` key `vendora_theme`.
- Global `ThemeToggle` component (`frontend/src/components/ThemeToggle.tsx`).
- CSS variables defined in `index.css` with smooth (reduced-motion aware) transitions.
To extend branding, adjust HSL tokens in `:root` / `.dark` blocks. Keep contrast ratios AA+ for text.

## Backups
Provided scripts:
- Windows: `backend/scripts/backup_database.ps1`
- Unix: `backend/scripts/backup_database.sh`
See `docs/OPERATIONS.md` for retention guidance.

## Roadmap (Highlights)
Planned tasks include: onboarding checklist, upgrade intent capture, feedback form, metrics export, announcements, vendor success dashboard, environment sanity script. Progress tracked in internal task list (see commits / PRs referencing IDs).

## Contributing
PRs welcome for:
1. New pluggable metrics export.
2. Improved accessibility (a11y audit).
3. Additional notification channels.

Please open an issue before large architectural changes.

## License
Currently proprietary (see `LICENSE`). An open-core split may be evaluated later.

---
Questions? Open an issue or start a discussion.
