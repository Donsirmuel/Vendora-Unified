#!/bin/bash
# DigitalOcean App Platform startup script
set -e

echo "Starting Vendora backend..."
echo "Working directory: $(pwd)"
echo "Python version: $(python --version 2>&1 || python3 --version 2>&1)"
echo "Python path: $PYTHONPATH"
echo "Django settings: $DJANGO_SETTINGS_MODULE"

# Set Django settings if not already set
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-vendora.settings}

# Add current directory to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Start Gunicorn with ASGI using python -m to ensure correct environment
echo "Starting Gunicorn with Uvicorn workers..."
exec python -m gunicorn vendora.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8080 \
  --workers 1 \
  --timeout 120 \
  --log-level info \
  --access-logfile - \
  --error-logfile -