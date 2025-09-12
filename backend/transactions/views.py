from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet
from typing import Any, cast
from api.permissions import IsOwner, IsVendorAdmin
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse


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
            qs = qs.filter(order__vendor=user).exclude(order__status="pending")
        return qs

    def get_serializer_class(self):
        from .serializers import TransactionSerializer

        return TransactionSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status in {"declined", "expired"}:
            return Response({"detail": "This transaction is read-only and cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status in {"declined", "expired"}:
            return Response({"detail": "This transaction is read-only and cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        from .models import Transaction
        from django.utils import timezone

        transaction = self.get_object()
        if transaction.order.vendor != request.user and not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        # Hard read-only for declined transactions
        if transaction.status == "declined":
            return Response({"detail": "This transaction is declined and cannot be updated."}, status=status.HTTP_400_BAD_REQUEST)

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
                    reply_markup = {"inline_keyboard": [[{"text": "🏠 Main Menu", "callback_data": "back_to_menu"}]]}
                    # Prefer sending vendor proof as a document if available
                    if transaction.vendor_proof and transaction.vendor_proof.name:
                        try:
                            with transaction.vendor_proof.open("rb") as f:
                                file_bytes = f.read()
                            tgs.send_document(file_bytes, filename=transaction.vendor_proof.name.split("/")[-1], caption=caption, chat_id=chat_id)
                            tgs.send_message("Tap to return to menu.", chat_id=chat_id, reply_markup=reply_markup)
                        except Exception:
                            tgs.send_message(caption, chat_id=chat_id, reply_markup=reply_markup)
                    else:
                        tgs.send_message(caption, chat_id=chat_id, reply_markup=reply_markup)
                else:
                    tgs.send_message(
                        f"❌ Order {transaction.order.order_code or transaction.order.id} marked declined by vendor.",
                        chat_id=chat_id,
                    )
        except Exception:
            pass

        return Response({"status": transaction.status}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="pdf")
    def download_pdf(self, request, pk=None):
        """Generate a simple PDF summary for the transaction and order."""
        transaction = self.get_object()
        if transaction.order.vendor != request.user and not request.user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        try:
            # Attempt to use reportlab if available
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            from io import BytesIO

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter

            y = height - 50
            p.setFont("Helvetica-Bold", 14)
            p.drawString(50, y, "Vendora Transaction Summary")
            y -= 25
            p.setFont("Helvetica", 10)

            order = transaction.order
            lines = [
                f"Order: {order.order_code or order.id}",
                f"Asset: {order.asset}",
                f"Type: {order.type}",
                f"Amount: {order.amount}",
                f"Rate: {order.rate}",
                f"Total Value: {order.total_value}",
                f"Status: {order.status}",
                f"Customer: {order.customer_name or ''}",
                f"Customer Chat ID: {order.customer_chat_id or ''}",
                f"Txn Status: {transaction.status}",
                f"Completed At: {transaction.completed_at or ''}",
                f"Vendor Completed At: {transaction.vendor_completed_at or ''}",
            ]

            for line in lines:
                p.drawString(50, y, str(line))
                y -= 15
                if y < 50:
                    p.showPage()
                    y = height - 50

            p.showPage()
            p.save()
            pdf = buffer.getvalue()
            buffer.close()

            response = HttpResponse(pdf, content_type="application/pdf")
            filename = f"transaction_{transaction.id}.pdf"
            response["Content-Disposition"] = f"attachment; filename=\"{filename}\""
            return response
        except Exception as e:
            return Response({"detail": f"PDF generation failed: {e}. Install 'reportlab' to enable PDFs."}, status=status.HTTP_501_NOT_IMPLEMENTED)
