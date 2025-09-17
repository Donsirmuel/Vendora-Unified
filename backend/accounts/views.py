from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from .models import Vendor, BroadcastMessage, BankDetail
from .serializers import VendorSerializer, BroadcastMessageSerializer, BankDetailSerializer
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

def compute_onboarding(vendor: Vendor):
    """Derive onboarding steps dynamically (no persistence yet)."""
    # Step definitions (id, label, done flag, optional url slug)
    steps = []
    # 1 Profile completeness (name + optional bio or telegram)
    profile_done = bool(vendor.name and vendor.name.strip())
    steps.append({"id": "profile", "label": "Complete profile", "done": profile_done})
    # 2 Set at least one active rate
    try:
        from rates.models import Rate  # type: ignore
        has_rate = Rate.objects.filter(vendor=vendor).exists()
    except Exception:
        has_rate = False
    steps.append({"id": "rates", "label": "Add first rate", "done": has_rate})
    # 3 First order placed or received
    try:
        from orders.models import Order  # type: ignore
        has_order = Order.objects.filter(vendor=vendor).exists()
    except Exception:
        has_order = False
    steps.append({"id": "order", "label": "Process first order", "done": has_order})
    # 4 Enable web push (placeholder: check any push subscription if model exists)
    push_enabled = False
    try:
        from notifications.models import PushSubscription  # type: ignore
        push_enabled = PushSubscription.objects.filter(vendor=vendor, is_active=True).exists()
    except Exception:
        push_enabled = False
    steps.append({"id": "push", "label": "Enable browser notifications", "done": push_enabled})
    # 5 Telegram connected (telegram_username or external id usable)
    from django.conf import settings
    telegram_connected = bool(vendor.telegram_username or getattr(settings, 'TELEGRAM_BOT_TOKEN', ''))
    steps.append({"id": "telegram", "label": "Connect Telegram bot", "done": telegram_connected})

    total = len(steps)
    completed = sum(1 for s in steps if s["done"])
    pct = int((completed / total) * 100) if total else 0
    return {"steps": steps, "completed": completed, "total": total, "percent": pct}


class VendorViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    # Support JSON for normal updates and multipart for avatar uploads
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_queryset(self) -> QuerySet[Any]:
        from .models import Vendor

        return cast(QuerySet[Any], cast(Any, Vendor).objects.all())

    def get_serializer_class(self):
        from .serializers import VendorSerializer

        return VendorSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx.update({"request": self.request})
        return ctx

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """Retrieve or update the authenticated vendor's own profile.

        GET /vendors/me/    -> current user's Vendor profile
        PATCH /vendors/me/  -> partial update of current user's Vendor profile
        """
        user = request.user
        if request.method.lower() == "get":
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        # PATCH
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="toggle-availability")
    def toggle_availability(self, request):
        """Toggle vendor availability and set optional unavailable message.

        Payload: { "is_available": bool, "unavailable_message": str? }
        """
        user = request.user
        is_available = request.data.get("is_available")
        message = request.data.get("unavailable_message", "")
        try:
            if isinstance(is_available, bool):
                user.is_available = is_available
            elif isinstance(is_available, str) and is_available.lower() in {"true","false"}:
                user.is_available = (is_available.lower() == "true")
            if not user.is_available:
                user.unavailable_message = str(message or "").strip()
            else:
                # Clear message when available
                user.unavailable_message = ""
            user.save(update_fields=["is_available", "unavailable_message", "updated_at"] if hasattr(user, "updated_at") else ["is_available", "unavailable_message"]) 
        except Exception:
            return Response({"detail": "Failed to update availability"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="onboarding")
    def onboarding(self, request):
        """Return dynamic onboarding checklist for the authenticated vendor.

        GET /api/v1/accounts/vendors/onboarding/
        """
        vendor = request.user
        data = compute_onboarding(vendor)
        return Response(data)


class BankDetailViewSet(ModelViewSet):
    serializer_class = BankDetailSerializer
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]

    def get_queryset(self) -> QuerySet[Any]:
        qs = cast(QuerySet[Any], cast(Any, BankDetail).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(vendor=user)
        return qs

    def perform_create(self, serializer):
        # If setting default, clear existing defaults for this vendor
        is_default = bool(serializer.validated_data.get("is_default", False))
        if is_default:
            BankDetail.objects.filter(vendor=self.request.user, is_default=True).update(is_default=False)
        serializer.save(vendor=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        # Determine if the updated instance should be default
        is_default = bool(serializer.validated_data.get("is_default", instance.is_default))
        if is_default and not instance.is_default:
            BankDetail.objects.filter(vendor=self.request.user, is_default=True).exclude(pk=instance.pk).update(is_default=False)
        serializer.save()


class BroadcastMessageViewSet(ModelViewSet):
    """ViewSet for managing broadcast messages to Telegram bot."""
    serializer_class = BroadcastMessageSerializer
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    
    def get_queryset(self) -> QuerySet[Any]:
        from .models import BroadcastMessage

        qs = cast(QuerySet[Any], cast(Any, BroadcastMessage).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(vendor=user)
        return qs

    def get_serializer_class(self):
        from .serializers import BroadcastMessageSerializer

        return BroadcastMessageSerializer

    def perform_create(self, serializer):
        """Automatically set the vendor to the current user."""
        serializer.save(vendor=self.request.user)

    @action(detail=True, methods=["post"], url_path="send-to-bot")
    def send_to_bot(self, request, pk=None):
        """Send the broadcast message to the Telegram bot."""
        from .models import BroadcastMessage
        from api.telegram_service import TelegramBotService
        from api.models import BotUser
        from django.utils import timezone
        
        broadcast = self.get_object()
        
        if broadcast.is_sent:
            return Response(
                {"detail": "Message already sent to bot"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send to Telegram bot
        telegram_service = TelegramBotService()
        # If subscribers exist, fan out to all; else send to default chat
        subscribers = list(BotUser.objects.filter(is_subscribed=True).values_list("chat_id", flat=True))
        if subscribers:
            errors = []
            for cid in subscribers:
                result = telegram_service.send_broadcast_message(broadcast)
                # Override chat per user
                result = telegram_service.send_message(
                    text=f"{broadcast.title}\n\n{broadcast.content}", chat_id=str(cid)
                )
                if not result["success"]:
                    errors.append(result.get("error"))
            ok = len(errors) == 0
            api_result = {"success": ok, "error": "; ".join(errors) if errors else None}
        else:
            api_result = telegram_service.send_broadcast_message(broadcast)
        
        if api_result["success"]:
            # Mark as sent and update timestamp
            broadcast.is_sent = True
            broadcast.sent_at = timezone.now()
            broadcast.save(update_fields=["is_sent", "sent_at"])
            
            return Response({
                "detail": "Message sent to bot successfully",
                "telegram_message_id": api_result.get("message_id")
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "detail": "Failed to send message to bot",
                "error": api_result.get("error", "Unknown error")
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = 'auth_burst'
