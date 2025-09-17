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
