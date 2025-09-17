from rest_framework.decorators import action
import json
from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters
from .models import PushSubscription
from django.conf import settings
from pywebpush import webpush, WebPushException
import logging

logger = logging.getLogger(__name__)


class NotificationViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "message"]
    ordering_fields = ["created_at"]

    def get_queryset(self) -> QuerySet[Any]:
        from .models import Notification

        qs = cast(QuerySet[Any], cast(Any, Notification).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(vendor=user)
        return qs

    def get_serializer_class(self):
        from .serializers import NotificationSerializer

        return NotificationSerializer

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response({"status": "marked_read"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="subscribe")
    def subscribe(self, request):
        """Save/Upsert a push subscription for the current vendor."""
        user = request.user
        sub = request.data or {}
        endpoint = sub.get("endpoint")
        keys = sub.get("keys") or {}
        p256dh = keys.get("p256dh")
        auth = keys.get("auth")
        if not endpoint or not p256dh or not auth:
            return Response({"detail": "Invalid subscription"}, status=status.HTTP_400_BAD_REQUEST)
        obj, _ = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={"vendor": user, "p256dh": p256dh, "auth": auth, "user_agent": request.META.get("HTTP_USER_AGENT", "")},
        )
        return Response({"status": "subscribed"}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="unsubscribe")
    def unsubscribe(self, request):
        endpoint = (request.data or {}).get("endpoint")
        if not endpoint:
            return Response({"detail": "Endpoint required"}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.filter(endpoint=endpoint, vendor=request.user).delete()
        return Response({"status": "unsubscribed"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="vapid-key", permission_classes=[AllowAny])
    def vapid_key(self, request):
        from django.conf import settings
        return Response({"publicKey": getattr(settings, "VAPID_PUBLIC_KEY", "")})

    @action(detail=False, methods=["post"], url_path="test-push")
    def test_push(self, request):
        """Send a test push notification to the current vendor to verify setup."""
        title = (request.data or {}).get("title") or "Vendora Test"
        message = (request.data or {}).get("message") or "Push notifications are working."
        try:
            send_web_push_to_vendor(request.user, title, message)
            return Response({"status": "sent"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Failed to send test push: %s", e)
            return Response({"detail": "Failed to send test push"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="subscriptions")
    def list_subscriptions(self, request):
        """Return current vendor's stored push subscription endpoints (for debugging)."""
        subs = PushSubscription.objects.filter(vendor=request.user).values("endpoint", "created_at", "user_agent")
        return Response({"results": list(subs)})


def send_web_push_to_vendor(vendor, title: str, message: str, url: str | None = None, icon: str | None = None):
    subs = PushSubscription.objects.filter(vendor=vendor)
    # Build VAPID claims, accepting either plain email or pre-prefixed "mailto:..."
    sub = getattr(settings, "VAPID_EMAIL", "admin@example.com")
    try:
        sub = str(sub).strip()
    except Exception:
        sub = "admin@example.com"
    if not sub.lower().startswith("mailto:"):
        sub = f"mailto:{sub}"
    vapid = {
        "vapid_private_key": getattr(settings, "VAPID_PRIVATE_KEY", ""),
        "vapid_claims": {"sub": sub},
    }
    payload = {"title": title, "message": message}
    if url:
        payload["url"] = url
    if icon:
        payload["icon"] = icon
    success, failed = 0, 0
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps(payload),
                **vapid,
            )
            success += 1
        except WebPushException as wpe:
            failed += 1
            # Prune subscriptions that are gone/invalid
            status_code = None
            try:
                status_code = getattr(getattr(wpe, "response", None), "status_code", None)
            except Exception:
                status_code = None
            if status_code in (401, 403, 404, 410):
                try:
                    sub.delete()
                except Exception:
                    pass
            else:
                logger.warning("WebPush failed for %s: %s", sub.endpoint, getattr(wpe, 'message', wpe))
        except Exception as e:
            failed += 1
            logger.exception("Unexpected error sending web push: %s", e)
    if failed and not success:
        # Surface a hint when all sends fail (likely VAPID keys missing or invalid)
        logger.error("All web push sends failed. Check VAPID_PUBLIC_KEY/PRIVATE_KEY and HTTPS context.")
    return {"sent": success, "failed": failed}
