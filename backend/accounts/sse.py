import time
import json
from django.http import StreamingHttpResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.conf import settings
from .models import PaymentRequest
from .signals import pop_events


@login_required
def legacy_payment_request_stream(request):
    user = request.user
    # If admin, allow vendor_id param
    vendor_id = request.GET.get('vendor_id') if (user.is_staff or user.is_superuser) else None
    if vendor_id:
        try:
            vendor_id = int(vendor_id)
        except Exception:
            return HttpResponseForbidden('Invalid vendor_id')
    else:
        vendor_id = getattr(user, 'id', None)

    def event_stream():
        # SSE prelude
        yield b'retry: 2000\n\n'

        if vendor_id is None or not isinstance(vendor_id, int):
            yield b'data: {"error": "Invalid vendor_id"}\n\n'
            return

        try:
            while True:
                try:
                    events = pop_events(vendor_id)
                    if events:
                        yield ('data: ' + json.dumps(events) + '\n\n').encode('utf-8')
                    else:
                        # keep the connection alive
                        yield b':\n'
                    time.sleep(1)
                except GeneratorExit:
                    break
                except Exception:
                    # ignore and continue
                    time.sleep(1)
        except GeneratorExit:
            return

        # Fallback polling: send latest payment requests every 2s (shouldn't be reached normally)
        while True:
            try:
                latest = PaymentRequest.objects.filter(vendor_id=vendor_id).order_by('-created_at')[:5]
                list_out = [
                    {
                        'id': getattr(p, 'id', None),
                        'status': getattr(p, 'status', None),
                        'created_at': p.created_at.isoformat() if getattr(p, 'created_at', None) is not None else None,
                        'processed_at': p.processed_at.isoformat() if p.processed_at is not None else None,
                    }
                    for p in latest
                ]
                if list_out:
                    yield ('data: ' + json.dumps(list_out) + '\n\n').encode('utf-8')
            except Exception:
                # ignore DB errors and keep trying
                pass
            time.sleep(2)

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')
import time
import json
from django.http import StreamingHttpResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.conf import settings
from .models import PaymentRequest


def _get_redis_client():
    try:
        import redis
    except Exception:
        return None
    url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
    return redis.from_url(url, decode_responses=True)


@login_required
def payment_request_stream(request):
    user = request.user
    # If admin, allow vendor_id param
    vendor_id = request.GET.get('vendor_id') if (user.is_staff or user.is_superuser) else None
    if vendor_id:
        try:
            vendor_id = int(vendor_id)
        except Exception:
            return HttpResponseForbidden('Invalid vendor_id')
    else:
        vendor_id = getattr(user, 'id', None)

    redis_client = _get_redis_client()

    def event_stream():
        # SSE prelude
        yield b'retry: 2000\n\n'

        if redis_client:
            # Subscribe to vendor-specific channel
            channel = f"payment_requests:{vendor_id}"
            try:
                pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
                pubsub.subscribe(channel)
                # Use a loop with timeout to yield messages
                while True:
                    message = pubsub.get_message(timeout=1.0)
                    if message and message.get('type') == 'message':
                        data = message.get('data')
                        if data is None:
                            # nothing to send
                            continue
                        # Ensure we have a string
                        if not isinstance(data, str):
                            data = str(data)
                        # Data is expected to be JSON string; escape newlines
                        yield (f"data: {data.replace('\n', '\\n')}\n\n").encode('utf-8')
                    else:
                        # Keep the connection alive with a noop comment line
                        yield b':\n'
                        time.sleep(0.1)
            except GeneratorExit:
                try:
                    pubsub.close()
                except Exception:
                    pass
            except Exception:
                # fallthrough to polling fallback below
                pass

        # Fallback polling: send latest payment requests every 2s
        while True:
            try:
                latest = PaymentRequest.objects.filter(vendor_id=vendor_id).order_by('-created_at')[:5]
                list_out = [
                    {
                        'id': getattr(p, 'id', None),
                        'status': getattr(p, 'status', None),
                        'created_at': p.created_at.isoformat() if getattr(p, 'created_at', None) is not None else None,
                        'processed_at': p.processed_at.isoformat() if p.processed_at is not None else None,
                    }
                    for p in latest
                ]
                if list_out:
                    yield ('data: ' + json.dumps(list_out) + '\n\n').encode('utf-8')
            except Exception:
                # ignore DB errors and keep trying
                pass
            time.sleep(2)

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')
