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
        from django.utils import timezone

        transaction = self.get_object()
        if transaction.order.vendor != request.user and not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        status_value = request.data.get("status")
        if status_value not in {"completed", "declined"}:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        # Allow vendor to upload their own proof file (e.g., transfer receipt)
        if "vendor_proof" in request.FILES:
            transaction.vendor_proof = request.FILES["vendor_proof"]

        # Update status and timestamps
        transaction.status = status_value
        if status_value == "completed" and not transaction.vendor_completed_at:
            transaction.vendor_completed_at = timezone.now()
        if status_value == "completed" and not transaction.completed_at:
            transaction.completed_at = timezone.now()
        transaction.save()

        # If order is still pending/accepted, mark as completed when transaction is completed
        try:
            from orders.models import Order
            order = transaction.order
            if status_value == "completed" and order.status in {Order.PENDING, Order.ACCEPTED}:
                order.status = Order.COMPLETED
                order.save(update_fields=["status"])
        except Exception:
            pass

        # Notify customer via Telegram if we have chat_id
        try:
            chat_id = str(transaction.order.customer_chat_id or "")
            if chat_id:
                from api.telegram_service import TelegramBotService
                tgs = TelegramBotService()
                if status_value == "completed":
                    caption = (
                        f"✅ Order {transaction.order.order_code or transaction.order.id} completed.\n"
                        f"Asset: {transaction.order.asset}\n"
                        f"Amount: {transaction.order.amount}\n"
                    )
                    # Prefer sending vendor proof as a document if available
                    if transaction.vendor_proof and transaction.vendor_proof.name:
                        try:
                            with transaction.vendor_proof.open("rb") as f:
                                file_bytes = f.read()
                            tgs.send_document(file_bytes, filename=transaction.vendor_proof.name.split("/")[-1], caption=caption, chat_id=chat_id)
                        except Exception:
                            tgs.send_message(caption, chat_id=chat_id)
                    else:
                        tgs.send_message(caption, chat_id=chat_id)
                else:
                    tgs.send_message(
                        f"❌ Order {transaction.order.order_code or transaction.order.id} marked declined by vendor.",
                        chat_id=chat_id,
                    )
        except Exception:
            pass

        return Response({"status": transaction.status}, status=status.HTTP_200_OK)
