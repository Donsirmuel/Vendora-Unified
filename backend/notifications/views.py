from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters


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
