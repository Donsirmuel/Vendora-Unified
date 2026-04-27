from ctypes import cast
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Max
from django.conf import settings
from django.core import signing
from django.contrib.auth import get_user_model
from time import sleep
import json

from rest_framework_simplejwt.authentication import JWTAuthentication
from orders.models import Order
from transactions.models import Transaction


def _resolve_request_user_from_auth_header(request):
    """Authenticate request using Authorization: Bearer JWT."""
    try:
        auth_result = JWTAuthentication().authenticate(request)
        if auth_result:
            return auth_result[0]
    except Exception:
        pass
    return None


def _build_stream_ticket(user_id: int) -> str:
    signer = signing.TimestampSigner(salt="vendora.sse.stream")
    return signer.sign(str(user_id))


def _authenticate_from_stream_ticket(request):
    """Authenticate SSE using a short-lived, signed stream ticket in query param `st`."""
    ticket = (request.GET.get("st") or "").strip()
    if not ticket:
        return None

    max_age_seconds = int(getattr(settings, "SSE_STREAM_TICKET_MAX_AGE", 90) or 90)
    signer = signing.TimestampSigner(salt="vendora.sse.stream")
    try:
        raw_user_id = signer.unsign(ticket, max_age=max_age_seconds)
        user_id = int(raw_user_id)
    except Exception:
        return None

    try:
        User = get_user_model()
        return User.objects.get(id=user_id)
    except Exception:
        return None


def issue_stream_ticket(request):
    """Mint a short-lived stream ticket for SSE clients.

    The frontend requests this endpoint with Bearer JWT, then uses the returned
    `stream_ticket` as `?st=...` when opening EventSource.
    """
    user = _resolve_request_user_from_auth_header(request)
    if not user or not user.is_authenticated:
        return JsonResponse({"detail": "Authentication required"}, status=401)

    max_age_seconds = int(getattr(settings, "SSE_STREAM_TICKET_MAX_AGE", 90) or 90)
    return JsonResponse({
        "stream_ticket": _build_stream_ticket(int(getattr(user, "id"))),
        "expires_in": max_age_seconds,
    })


def sse_stream(request):
    """
    Server-Sent Events stream for vendor updates.
    Emits whenever Orders or Transactions for the vendor change (based on max updated/created timestamps).
    Long-polls the DB for a short window and then closes, letting the client auto-reconnect.
    """
    user = _authenticate_from_stream_ticket(request)
    # Optional compatibility path (disabled by default) to support legacy clients.
    if (not user or not user.is_authenticated) and bool(getattr(settings, "ALLOW_LEGACY_SSE_QUERY_JWT", False)):
        token = request.GET.get("token")
        if token:
            try:
                auth = JWTAuthentication()
                validated = auth.get_validated_token(token)
                user = auth.get_user(validated)
            except Exception:
                user = None

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
