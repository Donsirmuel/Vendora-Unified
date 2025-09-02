# Deploy (Option A): DigitalOcean Droplet + Neon + Caddy

Prereqs
- GitHub Student Pack → redeem DigitalOcean credits
- Domain with DNS (Cloudflare or registrar)
- Neon Postgres database (free tier)

Steps (Runbook)
1) Create $5/mo Ubuntu droplet (1vCPU/1GB). SSH in.
2) Install Docker + Compose:
   - curl -fsSL https://get.docker.com | sh
   - sudo usermod -aG docker $USER; newgrp docker
3) Install git, clone repo: git clone https://github.com/Donsirmuel/Vendora-Unified.git
4) Copy env: cp backend/.env.prod.example backend/.env.prod and fill values (see Env keys below).
5) Set domain in Caddyfile (replace "yourdomain.com") and contact email.
6) Start services:
   - docker compose up -d --build
   - This builds frontend and backend, runs DB migrations automatically, serves via Caddy.
7) Create admin user:
   - docker compose exec app python manage.py createsuperuser
8) DNS: point A record of yourdomain.com to droplet IP. Caddy will auto-issue HTTPS.
9) Health: confirm https://yourdomain.com/healthz returns {"status":"ok"}.
10) Telegram: call POST /api/v1/telegram/webhook/set/ (secret token included). Verify /info/.

Notes
- Media persists via bind mount backend/media.
- Update: docker compose pull && docker compose up -d --build
- Logs: docker compose logs -f app caddy
- Scheduler: A lightweight scheduler container runs hourly license/order expiry jobs.

Env keys (backend/.env.prod)
- SECRET_KEY: strong random string
- DEBUG=False
- ALLOWED_HOSTS=yourdomain.com
- CSRF_TRUSTED_ORIGINS=https://yourdomain.com
- DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME (Neon)
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
- TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_WEBHOOK_URL, TELEGRAM_BOT_USERNAME, TELEGRAM_CHAT_ID
- ORDER_AUTO_EXPIRE_MINUTES=30 (default)
- CORS_ALLOWED_ORIGINS=https://yourdomain.com
- FRONTEND_URL=https://yourdomain.com
- EMAIL_BACKEND (optional), DEFAULT_FROM_EMAIL

Post-deploy QA checklist
- Login/Signup works; Trial banner shows with correct countdown.
- Create order → accept/decline → auto-expire pending after TTL (or via /api/v1/orders/expire-overdue/ for manual test).
- Complete a transaction; Dashboard insights show updated revenue and counts.
- Download PDFs for orders and transactions.
- Telegram flows work (/start, basic actions).
- PWA installable over HTTPS; push notifications prompt and receive test notification.
