from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet, Q
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone


class QueryViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["message", "reply"]
    ordering_fields = ["timestamp"]
    def get_queryset(self) -> QuerySet[Any]:
        from .models import Query

        qs = cast(QuerySet[Any], cast(Any, Query).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(Q(order__vendor=user) | Q(vendor=user))
        return qs

    def get_serializer_class(self):
        from .serializers import QuerySerializer

        return QuerySerializer

    def perform_create(self, serializer):
        # Default vendor to request.user when not provided directly and no order is linked
        instance = serializer.save(vendor=self.request.user if not serializer.validated_data.get("vendor") and not serializer.validated_data.get("order") else serializer.validated_data.get("vendor"))
        try:
            vendor = instance.vendor or (getattr(instance.order, "vendor", None))
            if vendor:
                from notifications.views import send_web_push_to_vendor
                title = "New customer query"
                context = f"Order {getattr(instance.order, 'order_code', instance.order_id)} has a new query" if instance.order_id else "New general question received"
                send_web_push_to_vendor(vendor, title, context, url="/queries")
        except Exception:
            pass

    @action(detail=True, methods=["post"], url_path="mark_done")
    def mark_done(self, request, pk=None):
        from .models import Query
        q = cast(Any, Query).objects.filter(pk=pk).first()
        if not q:
            return Response({"detail": "Query not found"}, status=status.HTTP_404_NOT_FOUND)
        # Permissions already enforced; mark resolved
        q.status = "resolved"
        q.save(update_fields=["status"])

        # Notify customer via Telegram if we have their chat_id
        try:
            chat_id = (q.customer_chat_id or "").strip()
            vendor = q.vendor or getattr(q.order, "vendor", None)
            if chat_id and vendor:
                from api.telegram_service import TelegramBotService
                from html import escape
                vendor_name = escape(str(getattr(vendor, "name", "Your vendor")))
                when = q.timestamp
                text = f"{vendor_name} will contact you soon in regards to your query created on {when:%Y-%m-%d %H:%M}."
                svc = TelegramBotService()
                svc.send_message(text, chat_id=str(chat_id))
                q.notified_at = timezone.now()
                q.save(update_fields=["notified_at"])
        except Exception:
            pass

        from .serializers import QuerySerializer
        return Response(QuerySerializer(q).data)
