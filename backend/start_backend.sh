#!/bin/sh
# Robust startup: prefer gunicorn+uvicorn, fallback to daphne, else runserver
set -e
echo "Starting backend with resilient launcher..."
python - <<'PY'
import importlib,sys
def has(mod):
    return importlib.util.find_spec(mod) is not None
sys.exit(0 if has('uvicorn') else 1)
PY
if [ $? -eq 0 ]; then
  echo "Running gunicorn with uvicorn worker"
  exec python -m gunicorn vendora.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8080 --workers 1 --timeout 120 --worker-tmp-dir /dev/shm
fi
python - <<'PY'
import importlib,sys
sys.exit(0 if importlib.util.find_spec('daphne') is not None else 1)
PY
if [ $? -eq 0 ]; then
  echo "Running daphne as fallback"
  exec daphne -b 0.0.0.0 -p 8080 vendora.asgi:application
fi
echo "Falling back to Django runserver (development)"
exec python manage.py runserver 0.0.0.0:8080
