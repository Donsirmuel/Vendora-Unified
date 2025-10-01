#!/bin/bash
# DigitalOcean App Platform startup script
set -e

echo "=== Vendora Backend Startup ==="
echo "Working directory: $(pwd)"
echo "Python version: $(python --version 2>&1 || python3 --version 2>&1)"
echo "Python path: $PYTHONPATH"
echo "Django settings: $DJANGO_SETTINGS_MODULE"

# List directory contents
echo ""
echo "=== Directory listing ==="
ls -la

# Check if vendora module exists
echo ""
echo "=== Checking vendora module ==="
if [ -d "vendora" ]; then
  ls -la vendora/
  if [ -f "vendora/asgi.py" ]; then
    echo "✓ vendora/asgi.py found"
  else
    echo "✗ vendora/asgi.py NOT found"
    exit 1
  fi
else
  echo "✗ vendora directory NOT found"
  exit 1
fi

# Set Django settings if not already set
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-vendora.settings}

# Add current directory to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Verify gunicorn is available
echo ""
echo "=== Checking gunicorn ==="
if python -m gunicorn --version; then
  echo "✓ Gunicorn is available"
else
  echo "✗ Gunicorn not found"
  exit 1
fi

# Check if database is accessible
echo ""
echo "=== Database connectivity ==="
if python manage.py check --database default; then
  echo "✓ Database is accessible"
else
  echo "✗ Database check failed (will continue anyway)"
fi

# Run migrations
echo ""
echo "=== Running database migrations ==="
python manage.py migrate --noinput

# Collect static files
echo ""
echo "=== Collecting static files ==="
python manage.py collectstatic --noinput --clear

# Start Gunicorn with ASGI using python -m to ensure correct environment
echo ""
echo "=== Starting Gunicorn with Uvicorn workers ==="
echo "Command: python -m gunicorn vendora.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080"
echo "Starting server..."
exec python -m gunicorn vendora.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080 --workers 1 --timeout 120 --log-level info --access-logfile - --error-logfile -
