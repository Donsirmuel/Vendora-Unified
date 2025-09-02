#!/usr/bin/env sh
set -e

python manage.py migrate --noinput

# Optional collectstatic if used
if [ -f "manage.py" ]; then
  if python - <<'PY'
import os
from django.conf import settings
print(getattr(settings, 'STATIC_ROOT', None) is not None)
PY
  then
    python manage.py collectstatic --noinput || true
  fi
fi

exec "$@"
