from django.http import JsonResponse, HttpRequest, HttpResponse
from django.conf import settings
from django.utils import timezone
from typing import Dict, Any
from threading import Lock

_metric_lock = Lock()
_counters: Dict[str, int] = {
    'throttle_429_total': 0,
}
_started_at = timezone.now()

def inc(name: str, value: int = 1) -> None:
    with _metric_lock:
        _counters[name] = _counters.get(name, 0) + value

def metrics_view(request: HttpRequest) -> HttpResponse:
    secret = getattr(settings, 'METRICS_SECRET', None)
    if secret:
        supplied = request.META.get('HTTP_X_METRICS_TOKEN', None)
        if supplied is None:
            supplied = request.GET.get('token', None)
        if supplied != secret:
            return JsonResponse({'detail': 'Forbidden'}, status=403)
    # Optional prometheus client
    try:
        from prometheus_client import generate_latest, CollectorRegistry, Gauge
        PROMETHEUS_AVAILABLE = True
    except Exception:
        PROMETHEUS_AVAILABLE = False

    from accounts.models import Vendor
    from rates.models import Rate
    from orders.models import Order
    now = timezone.now()
    with _metric_lock:
        counters_copy = dict(_counters)
    try:
        vendors_total = Vendor.objects.count()
    except Exception:
        vendors_total = 0
    try:
        rates_total = Rate.objects.count()
    except Exception:
        rates_total = 0
    try:
        orders_open = Order.objects.filter(status__in=['pending', 'accepted']).count()
    except Exception:
        orders_open = 0

    # If prometheus_client is available, return text/plain metrics
    if PROMETHEUS_AVAILABLE:
        registry = CollectorRegistry()
        g_uptime = Gauge('vendora_uptime_seconds', 'Uptime in seconds', registry=registry)
        g_vendors = Gauge('vendora_vendors_total', 'Total vendors', registry=registry)
        g_rates = Gauge('vendora_rates_total', 'Total rates', registry=registry)
        g_orders = Gauge('vendora_orders_open', 'Open orders count', registry=registry)
        # Set values
        g_uptime.set(int((now - _started_at).total_seconds()))
        g_vendors.set(vendors_total)
        g_rates.set(rates_total)
        g_orders.set(orders_open)
        # Expose counters
        for k, v in counters_copy.items():
            Gauge(f"vendora_{k}", f"counter {k}", registry=registry).set(v)

        return HttpResponse(generate_latest(registry), content_type='text/plain; version=0.0.4; charset=utf-8')

    payload: Dict[str, Any] = {
        'uptime_seconds': int((now - _started_at).total_seconds()),
        'timestamp': now.isoformat(),
        'counts': {},
        'vendors_total': vendors_total,
        'rates_total': rates_total,
        'orders_open': orders_open,
        'counters': counters_copy,
    }
    return JsonResponse(payload)
