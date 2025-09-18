from ctypes import cast
from django.http import StreamingHttpResponse, HttpResponse
from django.utils import timezone
from django.db.models import Max
from django.conf import settings
from time import sleep
import json

from rest_framework_simplejwt.authentication import JWTAuthentication
from orders.models import Order
from transactions.models import Transaction


def _authenticate_from_query_token(request):
    """
    Authenticate using a `token` query param (JWT access token).
    This avoids the limitation that EventSource cannot set Authorization headers.
    """
    token = request.GET.get("token")
    if not token:
        return None
    try:
        auth = JWTAuthentication()
        validated = auth.get_validated_token(token)
        user = auth.get_user(validated)
        return user
    except Exception:
        return None


def sse_stream(request):
    """
    Server-Sent Events stream for vendor updates.
    Emits whenever Orders or Transactions for the vendor change (based on max updated/created timestamps).
    Long-polls the DB for a short window and then closes, letting the client auto-reconnect.
    """
    user = _authenticate_from_query_token(request)
    if not user or not user.is_authenticated:
        return HttpResponse(status=401)

    vendor_id = getattr(user, "id", None)
    if vendor_id is None:
        return HttpResponse(status=403)

    # Window duration (seconds) before letting client reconnect
    window_seconds = int(getattr(settings, "SSE_WINDOW_SECONDS", 120))
    poll_interval = int(getattr(settings, "SSE_POLL_INTERVAL", 5))

    # capture initial markers
    def snapshot_marks():
        last_order = Order.objects.filter(vendor_id=vendor_id).aggregate(
            max_updated=Max("updated_at"), max_created=Max("created_at")
        )
        last_txn = Transaction.objects.filter(order__vendor_id=vendor_id).aggregate(
            max_completed=Max("completed_at"), max_vendor_completed=Max("vendor_completed_at")
        )
        # Use ISO strings or None
        def iso(dt):
            return dt.isoformat() if dt else None

        # Safely handle None for last_order and last_txn to avoid attribute errors
        orders_updated_at = None
        transactions_updated_at = None

        if last_order is not None:
            orders_updated_at = iso(last_order.get("max_updated")) or iso(last_order.get("max_created"))
        if last_txn is not None:
            transactions_updated_at = iso(last_txn.get("max_completed")) or iso(last_txn.get("max_vendor_completed"))

        return {
            "orders_updated_at": iso(last_order.get("max_updated")) or iso(last_order.get("max_created")),
            "transactions_updated_at": iso(last_txn.get("max_completed")) or iso(last_txn.get("max_vendor_completed")),
        }

    initial = snapshot_marks()

    def event_stream():
        start = timezone.now()
        last_marks = initial
        # Send an initial event so clients can sync
        ev = {
            "type": "snapshot",
            "data": last_marks,
        }
        payload = f"id: {int(start.timestamp())}\nevent: {ev['type']}\ndata: {json.dumps(ev['data'])}\n\n".encode("utf-8")
        yield payload

        while True:
            # Break after window to allow client reconnect (helps free workers)
            if (timezone.now() - start).total_seconds() > window_seconds:
                break
            # keep-alive comment every iteration
            yield b": keep-alive\n\n"

            sleep(poll_interval)

            current = snapshot_marks()
            if current != last_marks:
                last_marks = current
                now_ts = int(timezone.now().timestamp())
                ev = {
                    "type": "snapshot",
                    "data": current,
                }
                payload = f"id: {now_ts}\nevent: {ev['type']}\ndata: {json.dumps(ev['data'])}\n\n".encode("utf-8")
                yield payload

    resp = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    resp["Cache-Control"] = "no-cache"
    resp["X-Accel-Buffering"] = "no"  # for some proxies
    return resp
