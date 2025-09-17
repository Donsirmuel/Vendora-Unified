from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters


class RateViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsVendorAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["asset", "contract_address"]
    ordering_fields = ["asset"]
    throttle_scope = 'user'

    def get_throttles(self):  # type: ignore[override]
        # For write operations (POST, PATCH, PUT, DELETE) use rate_write scope
        if self.request and self.request.method in {"POST", "PATCH", "PUT", "DELETE"}:
            self.throttle_scope = 'rate_write'
        else:
            self.throttle_scope = 'user'
        return super().get_throttles()
    def get_queryset(self) -> QuerySet[Any]:
        from .models import Rate

        qs = cast(QuerySet[Any], cast(Any, Rate).objects.all())
        user = self.request.user
        if user and user.is_authenticated:
            qs = qs.filter(vendor=user)
        return qs

    def get_serializer_class(self):
        from .serializers import RateSerializer

        return RateSerializer

    def perform_create(self, serializer):
        # Gracefully handle duplicate asset per vendor returning 400 instead of 500
        from django.db import IntegrityError
        from rest_framework.exceptions import ValidationError
        try:
            serializer.save(vendor=self.request.user)
        except IntegrityError:
            raise ValidationError({"asset": ["Rate for this asset already exists for this vendor."]})

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.vendor != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Forbidden")
        serializer.save()
