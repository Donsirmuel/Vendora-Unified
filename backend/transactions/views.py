from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status


class TransactionViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["status"]
    ordering_fields = ["completed_at"]
    def get_queryset(self) -> QuerySet[Any]:
        from .models import Transaction

        qs = cast(QuerySet[Any], cast(Any, Transaction).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(order__vendor=user)
        return qs

    def get_serializer_class(self):
        from .serializers import TransactionSerializer

        return TransactionSerializer

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        from .models import Transaction

        transaction = self.get_object()
        if transaction.order.vendor != request.user and not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        status_value = request.data.get("status")
        if status_value not in {"completed", "declined"}:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        transaction.status = status_value
        if "proof" in request.FILES:
            transaction.proof = request.FILES["proof"]
        transaction.save()
        return Response({"status": transaction.status}, status=status.HTTP_200_OK)
