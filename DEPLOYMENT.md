# Deployment (No Docker)

Domain: app.vendora.page (root: vendora.page)
Database: Neon Postgres (DATABASE_URL)

## 1. Prerequisites (Server or Managed Host)
- Python 3.11+
- Node 18+ (if building frontend on server)
- Git
- (Optional) Nginx reverse proxy + TLS (Certbot)

## 2. Required Environment Variables
```
SECRET_KEY=<random-long>
DEBUG=false
ALLOWED_HOSTS=app.vendora.page,vendora.page
CSRF_TRUSTED_ORIGINS=https://app.vendora.page,https://vendora.page
DATABASE_URL=postgres://user:pass@host:5432/dbname?sslmode=require
LOG_LEVEL=INFO
LOG_JSON=true
ORDER_AUTO_EXPIRE_MINUTES=30
SENTRY_DSN=<optional>
FRONTEND_URL=https://app.vendora.page
VAPID_PUBLIC_KEY=<if using push>
VAPID_PRIVATE_KEY=<if using push>
VAPID_EMAIL=admin@vendora.page
```

## 3. First-Time Setup (VPS Example)
```
# System deps
sudo apt update && sudo apt install -y python3-venv python3-pip nginx git

# Clone
git clone <repo-url> vendora && cd vendora/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Build frontend (optional here; you can build locally and commit dist)
cd ../frontend
npm install
npm run build
cd ../backend

# Django prep
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 4. Running (Gunicorn + Nginx)
Systemd unit `/etc/systemd/system/vendora.service`:
```
[Unit]
Description=Vendora Django
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/home/ubuntu/vendora/backend
Environment="DJANGO_SETTINGS_MODULE=vendora.settings" "ENV=production"
ExecStart=/home/ubuntu/vendora/backend/.venv/bin/gunicorn vendora.wsgi:application --bind 127.0.0.1:8001 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
```
Enable:
```
sudo systemctl daemon-reload
sudo systemctl enable --now vendora
```

Nginx block `/etc/nginx/sites-available/vendora`:
```
server {
    server_name app.vendora.page;
    listen 80;

    location /static/ { alias /home/ubuntu/vendora/backend/static/; }
    location /media/  { alias /home/ubuntu/vendora/backend/media/; }

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }
}
```
Enable + TLS:
```
sudo ln -s /etc/nginx/sites-available/vendora /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.vendora.page
```

## 5. DNS
At name.com set an A record:
```
app  IN  A   <server_ipv4>
```
(Optionally AAAA for IPv6.) Root (vendora.page) can redirect to app subdomain.

## 6. Neon Postgres
- Create database + role.
- Copy connection string ("postgres://user:pass@.../dbname?sslmode=require").
- Set as `DATABASE_URL` env var.
- Run migrations after setting: `python manage.py migrate`.

## 7. Updating Code
```
cd /home/ubuntu/vendora
git pull origin main
source backend/.venv/bin/activate
pip install -r backend/requirements.txt --no-deps
python backend/manage.py migrate
python backend/manage.py collectstatic --noinput
sudo systemctl restart vendora
```

## 8. Backups (Manual Quick Method)
```
pg_dump --no-owner --format=custom "$DATABASE_URL" > vendora_$(date +%Y%m%d_%H%M).dump
```
Store dumps off-server.

## 9. Smoke Test Checklist
- Visit https://app.vendora.page/ (frontend loads)
- Login + obtain JWT
- Create order (pending) -> verify SSE snapshot updates
- Accept order -> transaction appears
- Create rate duplicate -> returns 400
- Health: /api/v1/healthz (200), /api/v1/health (200)

## 10. Rollback
Keep previous commit hash noted:
```
git checkout <previous_hash>
sudo systemctl restart vendora
```
If migrations broke schema, restore latest dump:
```
pg_restore --clean --no-owner --dbname "$DATABASE_URL" path_to_dump
```

## 11. Future Enhancements
- Add Redis for caching & session scaling.
- Add CDN for static/dist assets.
- Introduce staging environment (staging.app.vendora.page).
- Automated nightly backup script + retention.

## 12. Telegram Bot Deployment

You have two runtime modes—choose one (don’t run both simultaneously in production):

### Option A: Webhook (recommended if your host gives you HTTPS URL)
1. Set env vars:
```
TELEGRAM_BOT_TOKEN=12345:ABC...
TELEGRAM_WEBHOOK_SECRET=<random_string>
TELEGRAM_WEBHOOK_URL=https://app.vendora.page/api/v1/webhook/telegram/
```
2. After deploy, call a small Django shell snippet (once) to register webhook:
```
python manage.py shell -c "from api.telegram_service import TelegramBotService; from django.conf import settings; TelegramBotService().set_webhook(settings.TELEGRAM_WEBHOOK_URL)"
```
3. Telegram will push updates to your `/api/v1/webhook/telegram/` endpoint (make sure it exists and returns 200 quickly).

Pros: Near instant updates, lower CPU, no polling loops.
Cons: Requires public HTTPS reachable endpoint.

### Option B: Polling (fallback if webhook not possible)
1. Do NOT set TELEGRAM_WEBHOOK_URL (or leave empty) so you don’t mix modes.
2. Create a process (systemd service or background task) running the management command (if implemented) or a simple loop script (add later if needed).
3. Basic conceptual loop (pseudo):
```
offset=None
while True:
    resp = requests.get(f"https://api.telegram.org/botTOKEN/getUpdates", params={"timeout":30, "offset":offset})
    # process messages, set offset = last_update_id + 1
```
Polling every 2–3 seconds (or using long polling with timeout=30) is fine for low traffic.

Pros: Works without HTTPS or custom domain yet.
Cons: Constant process; slight delay (1–2s typical); more network usage.

### Bot Environment Variables Summary
| Variable | Purpose |
|----------|---------|
| TELEGRAM_BOT_TOKEN | Bot API token from BotFather |
| TELEGRAM_WEBHOOK_URL | Public HTTPS endpoint to receive updates (webhook mode) |
| TELEGRAM_WEBHOOK_SECRET | Secret token Telegram echoes in header (integrity) |
| TELEGRAM_CHAT_ID | Optional default chat id for global notifications |

### Verifying Webhook
```
python manage.py shell -c "from api.telegram_service import TelegramBotService as T; print(T().get_webhook_info())"
```
Look for the correct URL + last_error_date absent.

### Handling Failures
- If messages stop: re-run set_webhook.
- If you rotate the token: update env + set_webhook again.
- Keep logs: search for logger name `api.telegram_service`.


---
Short version: set env vars, install deps, migrate, collectstatic, run gunicorn behind Nginx, point DNS A record at server, enable TLS.

## 13. Public Landing Page (Marketing Site)

A lightweight static landing page lives in `landing/index.html`.

Deployment patterns:

1. Root Domain Separation
    - Serve `https://vendora.page/` from a static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages) using the `landing/` directory.
    - Keep the application at `https://app.vendora.page/`.

2. Publish
    - No build step required; upload `landing/` contents.
    - For Cloudflare Pages: set project root to `landing` and leave build command blank.

3. CTAs & Tracking
    - Existing buttons include `utm_source=landing` etc. Adjust if you A/B test headlines.

4. Legal Pages
    - Replace placeholder `Terms` / `Privacy` links once those static pages are created (see to‑do list).

5. Analytics (Optional)
    - Insert Plausible/other script before `</head>` when ready; ensure you respect privacy promises.

6. SEO
    - Meta description, Open Graph, Twitter card included. Add a 1200x630 social image and update `<meta property="og:image">` if customizing branding.

7. Caching
    - Static hosts auto-cache; purge via provider UI if rapid edits not visible.

Minimal change path: keep landing entirely static to avoid new attack surface and maintenance overhead.

## One-shot Droplet deploy script (Ubuntu)

If you prefer a one-shot script to bootstrap a fresh Ubuntu Droplet, there's a helper at `deployment/droplet_deploy.sh`.

Quick usage (run as root or with sudo on the Droplet):

1. Upload your SSH key and create a Droplet with Ubuntu 22.04 or 24.04.
2. SSH to the Droplet and run:

```bash
sudo bash -c 'curl -sL https://raw.githubusercontent.com/Donsirmuel/Vendora-Unified/main/deployment/droplet_deploy.sh -o /tmp/droplet_deploy.sh && bash /tmp/droplet_deploy.sh'
```

The script clones the repository, creates a `vendora` system user, installs system packages, sets up a Python venv, installs backend requirements, creates a minimal `backend/.env` (you must edit it), runs migrations, collects static files, installs and starts a sample Uvicorn systemd service, and configures Nginx. The script is intentionally conservative; review it before running.

See `deployment/uvicorn.service.example` and `deployment/nginx_vendora.conf.example` for systemd and Nginx examples. After first run, edit `backend/.env` with production secrets and restart the service:

```bash
sudo systemctl restart vendora-unified
sudo systemctl status vendora-unified
```

If you want us to produce a one-shot Droplet image or additional provisioning (Ansible / cloud-init), tell me and I can add that.

## Monitoring & alerting

Basics to get started:

- Errors/Exceptions: use Sentry (set `SENTRY_DSN`); configure alerting rules for error rate spikes and regressions.
- Uptime: add a ping monitor (UptimeRobot, Pingdom) for `/` and `/api/v1/healthz`.
- Metrics: expose Prometheus metrics from Uvicorn using `prometheus-middleware` or `prometheus-client`.

Quick Prometheus tip:

1. Install a small WSGI/ASGI exporter or middleware that exposes `/metrics`.
2. Point a Prometheus server to scrape `https://app.yourdomain.com/metrics`.
3. Create basic alerts: instance_down, high_error_rate, high_latency.

If you want, I can add a small middleware to expose a minimal `/metrics` route or recommend a specific library and config for Uvicorn.

## One-shot DigitalOcean Droplet (Ubuntu) — Step-by-step

This checklist provisions a single Ubuntu Droplet and deploys Vendora without Docker. It assumes you control the domain and have an SSH key.

1) Create Droplet

- Create an Ubuntu 22.04 or 24.04 Droplet and add your SSH key.

2) Basic OS prep

```bash
ssh ubuntu@<DROPLET_IP>
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx python3-venv python3-pip build-essential libpq-dev ufw certbot python3-certbot-nginx
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

3) Clone repo & create app user

```bash
sudo useradd -m -s /bin/bash vendora || true
cd /home/ubuntu
git clone https://github.com/Donsirmuel/Vendora-Unified.git vendora || (cd vendora && git pull)
cd vendora/backend
```

4) Python venv & dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

5) (Optional) Build frontend on server

```bash
cd ../frontend
npm ci
npm run build
cd ../backend
```

6) Configure environment

```bash
cp .env.example backend/.env
# Edit backend/.env with production values (SECRET_KEY, DATABASE_URL, ALLOWED_HOSTS, etc.)
nano backend/.env
```

7) Migrate & collectstatic

```bash
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

8) Install systemd service (Uvicorn)

```bash
sudo cp deployment/uvicorn.service.example /etc/systemd/system/vendora-unified.service
sudo systemctl daemon-reload
sudo systemctl enable --now vendora-unified
sudo systemctl status vendora-unified
```

9) Configure Nginx and enable site

```bash
sudo cp deployment/nginx_vendora.conf.example /etc/nginx/sites-available/vendora
sudo ln -sf /etc/nginx/sites-available/vendora /etc/nginx/sites-enabled/vendora
sudo nginx -t && sudo systemctl reload nginx
```

10) Obtain TLS with Certbot

```bash
sudo certbot --nginx -d app.yourdomain.com -m you@yourdomain.com --agree-tos --non-interactive
```

11) Post-deploy checks

- Visit https://app.yourdomain.com
- Check health endpoints: `/api/v1/healthz` and `/api/v1/health`
- Verify WebSocket/Channels endpoints if using real-time features.

12) Updating code

```bash
cd /home/ubuntu/vendora
git fetch --all && git reset --hard origin/main
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart vendora-unified
```

Notes:
- Use Uvicorn ASGI to support Channels/WebSockets. For multi-instance production use Redis as the channel layer.
- Keep secrets out of version control and consider a secrets manager for production.

### systemd EnvironmentFile (secrets)

For simple setups you can store production env values in a file that systemd reads at service start. Prefer root-only files and never commit them.

Example:

```bash
sudo mkdir -p /etc/vendora
sudo chown root:root /etc/vendora
sudo chmod 700 /etc/vendora
sudo nano /etc/vendora/env   # paste SECRET_KEY, DATABASE_URL, REDIS_URL, etc.
sudo chmod 600 /etc/vendora/env
```

Then reference the file in the systemd unit with `EnvironmentFile=/etc/vendora/env` (see `deployment/env.example.service`).

### Redis channel layer (production)

For horizontal scaling (multiple app instances) you must use Redis for `CHANNEL_LAYERS`. Set the `REDIS_URL` env var (e.g. `redis://localhost:6379/0`) on the server and install `channels_redis` in your backend environment:

```bash
source /home/vendora/vendora/backend/.venv/bin/activate
pip install channels_redis
```

Restart the ASGI service after setting `REDIS_URL`.

## Production hardening & operations

This section collects practical, low-risk hardening and operational recommendations to run Vendora safely in production.

1) System user & file permissions

- Run the app under a dedicated, unprivileged system user (example: `vendora`). Do not run as `root`.
- Limit file ownership and permissions:

```bash
sudo chown -R vendora:vendora /home/ubuntu/vendora
sudo chmod -R 750 /home/ubuntu/vendora/backend
sudo chmod -R 750 /home/ubuntu/vendora/frontend/dist || true
# Make .env readable only by the app user
sudo chown vendora:vendora /home/ubuntu/vendora/backend/.env
sudo chmod 600 /home/ubuntu/vendora/backend/.env
```

2) Secure environment variables (.env)

- Avoid committing `.env` to Git. Keep a single `backend/.env` on the server and restrict access to the application user only (600). Use `.env.example` in repo for defaults.
- Prefer a secrets manager (Vault, AWS Secrets Manager, DigitalOcean Secrets, or environment variables injected at process startup) for sensitive values in production.
- If using systemd drop-in or EnvironmentFile, restrict permission on that file similarly and avoid exposing it to other users.

3) systemd service hardening

- Use a systemd service unit with security directives to limit privileges. Example additions:

```ini
User=vendora
Group=vendora
PrivateTmp=true
ProtectSystem=full
NoNewPrivileges=true
ProtectHome=true
ProtectKernelTunables=true
ProtectControlGroups=true
ReadWritePaths=/home/vendora/vendora/backend/media /home/vendora/vendora/backend/static
AmbientCapabilities=
```

4) Nginx security & TLS

- Use modern TLS settings and enable HSTS. Example (Certbot usually sets this):

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:...';
```

- Ensure Nginx passes WebSocket headers for Channels:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_http_version 1.1;
```

5) Django security settings checklist

- DEBUG=false
- Use a strong random `SECRET_KEY` (rotate proactively if leaked).
- Set `ALLOWED_HOSTS` to your hostnames.
- Set `SECURE_SSL_REDIRECT = True` if behind TLS.
- `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True`.
- `SECURE_HSTS_SECONDS = 63072000` (enable after verifying TLS), `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`.
- `SECURE_BROWSER_XSS_FILTER = True`, `X_FRAME_OPTIONS = 'DENY'`.
- Limit password reset tokens and consider reCAPTCHA for public forms if under attack.

6) Logging, metrics, and alerting

- Send logs to a central system (Sentry for exceptions, or ELK/Loki for structured logs). Configure `SENTRY_DSN` when available.
- Rotate logs (systemd journal + logrotate for any file-based logs). Example `logrotate` snippet for Uvicorn access logs:

```text
/var/log/vendora/*.log {
    daily
    rotate 14
    compress
    missingok
    copytruncate
}
```

- Export Prometheus metrics or use existing `/metrics` endpoints if you added them; otherwise instrument key requests and background tasks.

7) Backups and restore testing

- Automate daily DB backups and keep at least 7 days of retention off-host. Example using `pg_dump` to a remote S3-compatible store or DigitalOcean Spaces.
- Periodically test restores in a staging environment. Store `pg_dump` files encrypted at rest.

8) Upgrades & migrations (safe pattern)

1. Create a maintenance window and notify users.
2. Pull new code on a staging replica and run migrations there first.
3. On production: `git fetch && git reset --hard origin/main`.
4. Install new deps: `pip install -r requirements.txt` in venv.
5. Run `python manage.py migrate`.
6. Collect static and restart service: `python manage.py collectstatic --noinput && sudo systemctl restart vendora-unified`.
7. Verify smoke tests and health endpoints before closing maintenance.

9) Database & credentials lifecycle

- Rotate DB credentials periodically and on personnel changes. Use short-lived credentials where supported.
- For Neon or other managed Postgres, use SSL and set `?sslmode=require` in `DATABASE_URL`.

10) Secrets in CI/CD

- Do not expose production secrets to PRs or forks. Use CI secrets masking and environment injection.

11) Monitoring & uptime

- Add an uptime monitor (UptimeRobot, Pingdom) for the homepage and key API endpoints.
- Configure alerts for high error rates (Sentry), high latency, and low disk space.

12) Incident response & runbooks

- Keep a short runbook for common tasks: restart service, view logs, rollback migration (pg_restore), flush caches, and how to rotate secrets.

13) Optional: containerization for reproducibility

- Even though you requested a non-Docker path, consider producing a Docker build for reproducible deployments in CI. Keep a single canonical build image and run it under systemd or containerd in production if you later decide to use containers.

If you'd like, I can:
- Produce a hardened example `systemd` unit that includes the security directives above.
- Add a small `logrotate` config and a backup script that pushes dumps to DigitalOcean Spaces (or S3) and a short Ansible playbook to centralize these settings.

