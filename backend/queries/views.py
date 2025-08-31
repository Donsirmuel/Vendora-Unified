from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters


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
            qs = qs.filter(order__vendor=user)
        return qs

    def get_serializer_class(self):
        from .serializers import QuerySerializer

        return QuerySerializer
