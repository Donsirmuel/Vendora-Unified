#!/bin/bash
# DigitalOcean App Platform startup script

echo "Starting Vendora backend..."
echo "Working directory: $(pwd)"
echo "Python path: $PYTHONPATH"
echo "Django settings: $DJANGO_SETTINGS_MODULE"

# Set Django settings if not already set
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-vendora.settings}

# Add current directory to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start Gunicorn with ASGI
exec gunicorn vendora.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8080 \
  --workers 1 \
  --timeout 120 \
  --log-level info \
  --access-logfile - \
  --error-logfile -