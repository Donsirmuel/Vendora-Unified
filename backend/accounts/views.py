from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from .models import Vendor, BroadcastMessage
from .serializers import VendorSerializer, BroadcastMessageSerializer
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer


class VendorViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    
    def get_queryset(self) -> QuerySet[Any]:
        from .models import Vendor

        return cast(QuerySet[Any], cast(Any, Vendor).objects.all())

    def get_serializer_class(self):
        from .serializers import VendorSerializer

        return VendorSerializer

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
