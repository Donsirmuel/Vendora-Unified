#!/usr/bin/env bash
# One-shot Droplet deploy script for Vendora-Unified
# Target: Ubuntu 22.04+ on DigitalOcean (or similar Debian/Ubuntu cloud image)
# Run as root (or via sudo) on a freshly created Droplet.

set -euo pipefail
IFS=$'\n\t'

APP_NAME=vendora-unified
APP_USER=vendora
APP_DIR=/home/${APP_USER}/${APP_NAME}
REPO_URL="https://github.com/Donsirmuel/Vendora-Unified.git"
BRANCH=main
PYTHON=python3.11
GUNICORN_WORKERS=2
UWSGI_SOCKET=/run/${APP_NAME}.sock
UVICORN_SOCKET=/run/${APP_NAME}.sock
ENV_FILE=${APP_DIR}/backend/.env
DOMAIN="" # set or pass as env var
POSTGRES_HOST="" # optional: if empty, install local postgres
POSTGRES_DB=${APP_NAME}
POSTGRES_USER=${APP_NAME}
POSTGRES_PASSWORD="" # optional: generated if empty
NGINX_CONF=/etc/nginx/sites-available/${APP_NAME}
SSL_EMAIL="" # your email for certbot

log() { echo "[deploy] $*"; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "[deploy] missing: $1" >&2; exit 1; } }

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root. Use sudo." >&2
  exit 1
fi

log "Updating apt and installing base packages..."
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt upgrade -y
apt install -y git curl wget build-essential ${PYTHON} ${PYTHON}-venv ${PYTHON}-dev 
apt install -y nginx certbot python3-certbot-nginx

# Optional: install Postgres locally if no external host provided
if [ -z "${POSTGRES_HOST}" ]; then
  log "Installing PostgreSQL locally..."
  apt install -y postgresql postgresql-contrib libpq-dev
  sudo -u postgres psql -c "CREATE ROLE ${POSTGRES_USER} WITH LOGIN PASSWORD 'changeme';" || true
  sudo -u postgres psql -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};" || true
  POSTGRES_HOST=localhost
  POSTGRES_PASSWORD=changeme
fi

log "Creating application user and directories..."\nid -u ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}
mkdir -p ${APP_DIR}
chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

log "Cloning repository..."
if [ ! -d "${APP_DIR}/.git" ]; then
  sudo -u ${APP_USER} git clone ${REPO_URL} ${APP_DIR}
else
  sudo -u ${APP_USER} git -C ${APP_DIR} fetch --all
fi
sudo -u ${APP_USER} git -C ${APP_DIR} checkout ${BRANCH}
sudo -u ${APP_USER} git -C ${APP_DIR} pull origin ${BRANCH}

log "Creating Python virtualenv and installing requirements..."
sudo -u ${APP_USER} ${PYTHON} -m venv ${APP_DIR}/venv

# Activate and install requirements as the app user
sudo -H -u ${APP_USER} bash -lc "source ${APP_DIR}/venv/bin/activate && pip install --upgrade pip wheel setuptools && pip install -r ${APP_DIR}/backend/requirements.txt"

log "Creating .env file if missing (you must edit this for production)..."
if [ ! -f "${ENV_FILE}" ]; then
  cat > "${ENV_FILE}" <<EOF
# Minimal .env
DJANGO_SETTINGS_MODULE=vendora.settings.production
SECRET_KEY=replace-me-with-secure-random
DEBUG=False
ALLOWED_HOSTS=${DOMAIN}
DATABASE_URL=postgres://"${POSTGRES_USER}":"${POSTGRES_PASSWORD}"@${POSTGRES_HOST}:5432/${POSTGRES_DB}
# Add other secrets (EMAIL_HOST, AWS creds for media, TELEGRAM_TOKEN, etc.)
EOF
  chown ${APP_USER}:${APP_USER} "${ENV_FILE}"
fi

log "Collecting static files, migrating DB, creating superuser (interactive)..."
sudo -H -u ${APP_USER} bash -lc "source ${APP_DIR}/venv/bin/activate && cd ${APP_DIR}/backend && python manage.py migrate --noinput && python manage.py collectstatic --noinput"

# Create systemd unit for uvicorn
log "Installing systemd service for uvicorn..."
cat > /etc/systemd/system/${APP_NAME}.service <<'UNIT'
[Unit]
Description=Vendora ASGI Uvicorn
After=network.target

[Service]
User=vendora
Group=vendora
WorkingDirectory=/home/vendora/vendora-unified/backend
EnvironmentFile=/home/vendora/vendora-unified/backend/.env
ExecStart=/home/vendora/vendora-unified/venv/bin/uvicorn vendora.asgi:application --host 127.0.0.1 --port 8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable ${APP_NAME}.service
systemctl start ${APP_NAME}.service

# Nginx site
log "Configuring nginx..."
cat > ${NGINX_CONF} <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location /static/ {
        alias /home/${APP_USER}/${APP_NAME}/backend/static/;
    }

    location /media/ {
        alias /home/${APP_USER}/${APP_NAME}/backend/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf ${NGINX_CONF} /etc/nginx/sites-enabled/${APP_NAME}
nginx -t && systemctl restart nginx

# SSL via Certbot
if [ -n "${DOMAIN}" ] && [ -n "${SSL_EMAIL}" ]; then
  log "Obtaining TLS certs via certbot..."
  certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${SSL_EMAIL} || true
  systemctl reload nginx || true
fi

log "Deployment finished. Check systemctl status ${APP_NAME}.service and nginx logs."
log "Edit ${ENV_FILE} and secrets, then restart the service: systemctl restart ${APP_NAME}.service"

exit 0
