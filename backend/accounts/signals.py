from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.core.mail import send_mail
from .models import PaymentRequest
import json


@receiver(post_save, sender=PaymentRequest)
def notify_admin_on_payment_request(sender, instance: PaymentRequest, created, **kwargs):
    if not created:
        return
    admin_email = getattr(settings, 'ADMIN_EMAIL', None) or getattr(settings, 'VAPID_EMAIL', None)
    if not admin_email:
        return
    subject = f"New payment request from {getattr(instance, 'vendor', getattr(instance, 'vendor_email', 'unknown'))}"
    body = f"A new payment request (id: {getattr(instance, 'pk', None)}) was created by {getattr(instance, 'vendor', getattr(instance, 'vendor_email', 'unknown'))}.\n\nNote: {getattr(instance, 'note', '') or ''}\n\nPlease review and approve: {getattr(settings, 'SITE_URL', '')}/admin/accounts/paymentrequest/{getattr(instance, 'pk', None)}/change/"
    send_mail(subject, body, getattr(settings, 'DEFAULT_FROM_EMAIL', admin_email), [admin_email], fail_silently=True)


# --- In-memory event store for SSE (single-process dev) ---
_EVENT_STORE = {}


def push_event(vendor_id: int, event: dict):
    key = str(vendor_id)
    _EVENT_STORE.setdefault(key, []).append(event)


def pop_events(vendor_id: int):
    key = str(vendor_id)
    items = _EVENT_STORE.pop(key, [])
    return items


@receiver(post_save, sender=PaymentRequest)
def push_payment_event(sender, instance: PaymentRequest, created, **kwargs):
    # Publish PaymentRequest change to the in-memory event store for SSE
    created_at = getattr(instance, 'created_at', None)
    processed_at = getattr(instance, 'processed_at', None)
    ev = {
        'id': getattr(instance, 'id', None),
        'status': getattr(instance, 'status', None),
        'created_at': created_at.isoformat() if created_at else None,
        'processed_at': processed_at.isoformat() if processed_at else None,
    }
    vendor_id = getattr(instance, 'vendor_id', None)
    if vendor_id is None:
        return
    # Try to broadcast over Channels channel layer if available
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if channel_layer is not None:
            group_name = f"payment_requests_{vendor_id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'payment_request_event',
                    'data': ev,
                }
            )
            return
    except Exception:
        # Fall back to in-memory store if channels are not available
        pass

    try:
        push_event(vendor_id, ev)
    except Exception:
        pass
