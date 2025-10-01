#!/bin/bash
# DigitalOcean App Platform startup script
set -e

echo "Starting Vendora backend..."
echo "Working directory: $(pwd)"
echo "Python version: $(python --version 2>&1 || python3 --version 2>&1)"
echo "Python path: $PYTHONPATH"
echo "Django settings: $DJANGO_SETTINGS_MODULE"
echo "Directory listing:"
ls -la
echo "Checking vendora module:"
ls -la vendora/ 2>/dev/null || echo "vendora directory not found"

# Set Django settings if not already set
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-vendora.settings}

# Add current directory to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Verify gunicorn is available
echo "Gunicorn version:"
python -m gunicorn --version || echo "Gunicorn not found via python -m"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Start Gunicorn with ASGI using python -m to ensure correct environment
echo "Starting Gunicorn with Uvicorn workers..."
echo "Command: python -m gunicorn vendora.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080"
exec python -m gunicorn vendora.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8080 \
  --workers 1 \
  --timeout 120 \
  --log-level info \
  --access-logfile - \
  --error-logfile -