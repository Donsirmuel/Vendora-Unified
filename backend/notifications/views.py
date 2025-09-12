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


def send_web_push_to_vendor(vendor, title: str, message: str):
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
        except Exception:
            # Ignore failures for now
            continue
