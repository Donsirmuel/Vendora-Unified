from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status


class OrderViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset", "type", "status"]
    ordering_fields = ["created_at", "amount", "rate"]
    def get_queryset(self) -> QuerySet[Any]:
        from .models import Order

        qs = cast(QuerySet[Any], cast(Any, Order).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(vendor=user)
        return qs

    def get_serializer_class(self):
        from .serializers import OrderSerializer

        return OrderSerializer

    def perform_create(self, serializer):
        # Set vendor from authenticated user
        serializer.save(vendor=self.request.user)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        from .models import Order

        order = self.get_object()
        if order.vendor != request.user and not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get acceptance note from request
        acceptance_note = request.data.get("acceptance_note", "")
        
        order.status = Order.ACCEPTED
        order.acceptance_note = acceptance_note
        order.save(update_fields=["status", "acceptance_note"])
        
        # Serialize the updated order
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="decline")
    def decline(self, request, pk=None):
        from .models import Order

        order = self.get_object()
        if order.vendor != request.user and not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get rejection reason from request
        rejection_reason = request.data.get("rejection_reason", "")
        if not rejection_reason:
            return Response(
                {"detail": "Rejection reason is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = Order.DECLINED
        order.rejection_reason = rejection_reason
        order.save(update_fields=["status", "rejection_reason"])
        
        # Serialize the updated order
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)
