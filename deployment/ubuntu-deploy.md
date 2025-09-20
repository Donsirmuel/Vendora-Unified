## Deploying Vendora-Unified to a Linux VM (Ubuntu) without Docker

This document walks through a minimal, production-ready deployment on an Ubuntu VM using virtualenv, Gunicorn, and Nginx. It assumes you have root / sudo access to the VM.

High-level steps
- Create a dedicated user and clone the repo
- Create a Python virtual environment and install requirements
- Create an environment file with secrets & configuration
- Run migrations and collect static files
- Create a systemd unit to run Gunicorn
- Configure Nginx as a reverse proxy and enable HTTPS (certbot)

Quick commands (run as your deploy user):

```bash
# create user (optional)
sudo adduser --disabled-password --gecos "" vendora
sudo usermod -aG www-data vendora

# switch to deploy user and clone
sudo -i -u vendora bash
cd ~
git clone https://your.git.repo/Vendora-Unified.git
cd Vendora-Unified/backend

# create venv and install deps
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# create .env (example values)
cat > .env <<'ENV'
DJANGO_SETTINGS_MODULE=vendora.settings
SECRET_KEY=replace-with-secret
DEBUG=False
ALLOWED_HOSTS=your.domain.com
DATABASE_URL=postgres://user:pass@db-host:5432/dbname
DEFAULT_FROM_EMAIL=webmaster@your.domain.com
SITE_URL=https://your.domain.com
ENV

# apply migrations and collect static
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# (optionally) create admin user interactively
python manage.py createsuperuser

# exit deploy user
deactivate
exit
```

Systemd unit (create `/etc/systemd/system/gunicorn-vendora.service`) — sample in repo: `deployment/gunicorn.service`

Nginx site (create `/etc/nginx/sites-available/vendora`) — sample in repo: `deployment/nginx.conf`

After creating the files, enable and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gunicorn-vendora
sudo ln -s /etc/nginx/sites-available/vendora /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# Install certbot and request a certificate
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

Notes / production considerations
- Run Gunicorn with a socket (unix) file and limit workers by CPU cores.
- Ensure file permissions for static/media are correct and served by Nginx.
- Use a private database (Postgres) and store credentials in environment variables or a secrets manager.
- Monitor logs: `sudo journalctl -u gunicorn-vendora -f` and `sudo tail -F /var/log/nginx/error.log`.
