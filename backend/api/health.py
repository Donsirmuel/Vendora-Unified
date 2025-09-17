from django.http import JsonResponse
from django.db import connections
from django.utils.timezone import now
import socket

def health_view(request):
    db_ok = True
    try:
        with connections['default'].cursor() as cur:
            cur.execute('SELECT 1')
            cur.fetchone()
    except Exception:
        db_ok = False
    return JsonResponse({
        'status': 'ok' if db_ok else 'degraded',
        'db': db_ok,
        'time': now().isoformat(),
        'host': socket.gethostname(),
        'version': '1.0.0'
    })
