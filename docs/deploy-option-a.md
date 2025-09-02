# Deploy (Option A): DigitalOcean Droplet + Neon + Caddy

Prereqs
- GitHub Student Pack → redeem DigitalOcean credits
- Domain with DNS (Cloudflare or registrar)
- Neon Postgres database (free tier)

Steps
1) Create $5/mo Ubuntu droplet (1vCPU/1GB). SSH in.
2) Install Docker + Compose:
   - curl -fsSL https://get.docker.com | sh
   - sudo usermod -aG docker $USER; newgrp docker
3) Clone repo: git clone https://github.com/Donsirmuel/Vendora-Unified.git
4) Copy env: cp backend/.env.prod.example backend/.env.prod and fill values.
5) Set domain in Caddyfile (replace yourdomain.com) and email.
6) Build frontend locally or in Docker build (already wired). Then run:
   - docker compose up -d --build
7) Migrate and create admin (entrypoint runs migrate automatically). To create user:
   - docker compose exec app python manage.py createsuperuser
8) DNS: point A record of yourdomain.com to droplet IP. Caddy will auto-issue HTTPS.
9) Telegram: call POST /api/v1/telegram/webhook/set/ (secret token included). Verify /info/.

Notes
- Media persists via bind mount backend/media.
- Update: docker compose pull && docker compose up -d --build
- Logs: docker compose logs -f app caddy
