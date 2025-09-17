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
            # Scope to the vendor's own orders only
            qs = qs.filter(order__vendor=user)
        # Optional status filter via query param (exact)
        try:
            status_param = (self.request.GET.get("status") or "").strip()
            if status_param:
                qs = qs.filter(status=status_param)
        except Exception:
            pass
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

        # Declined transactions are terminal and cannot transition to completed.
        if transaction.status == "declined":
            return Response({"detail": "This transaction is declined and cannot be updated."}, status=status.HTTP_400_BAD_REQUEST)

        status_value = request.data.get("status")
        if status_value not in {"completed", "declined"}:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        # Allow vendor to upload their own proof file (e.g., transfer receipt)
        if "vendor_proof" in request.FILES:
            transaction.vendor_proof = request.FILES["vendor_proof"]
        # Accept generic 'proof' field (test uses 'proof')
        if "proof" in request.FILES:
            transaction.proof = request.FILES["proof"]

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
                from accounts.models import Vendor
                from typing import Any, cast
                tgs = TelegramBotService()
                if status_value == "completed":
                    order = transaction.order
                    vendor = cast(Any, Vendor).objects.filter(id=getattr(order.vendor, "id", None)).first()
                    vendor_name = getattr(vendor, "name", "Your vendor") if vendor else "Your vendor"
                    # Compute vendor trust metric: number of completed transactions
                    try:
                        success_count = type(transaction).objects.filter(order__vendor=vendor, status="completed").count() if vendor else 0
                    except Exception:
                        success_count = 0
                    caption = (
                        f"✅ Order {order.order_code or order.id} completed.\n"
                        f"Asset: {order.asset}\n"
                        f"Amount: {order.amount}\n\n"
                        f"Thank you for using Vendora. {vendor_name} has successfully delivered. "
                        f"{success_count} trades completed without issue."
                    )
                    # Quick repeat trade and new trade actions
                    try:
                        asset = str(getattr(order, "asset", "")).upper()
                        otype = str(getattr(order, "type", "buy")).lower()
                        amt = str(getattr(order, "amount", "")).replace(",", "")
                        repeat_cb = f"repeat_{asset}_{otype}_{amt}" if asset and amt else "back_to_menu"
                    except Exception:
                        repeat_cb = "back_to_menu"
                    reply_markup = {
                        "inline_keyboard": [
                            [{"text": "🔁 Repeat this trade", "callback_data": repeat_cb}],
                            [{"text": "� Start a new trade", "callback_data": "back_to_menu"}],
                            [{"text": "�🏠 Main Menu", "callback_data": "back_to_menu"}],
                        ]
                    }
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
            from reportlab.lib import colors
            from io import BytesIO

            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter

            # Helpers
            def hr(ypos, c=colors.HexColor("#e5e7eb")):
                p.setStrokeColor(c)
                p.setLineWidth(0.7)
                p.line(50, ypos, width - 50, ypos)

            def money(val):
                try:
                    from decimal import Decimal
                    v = val if isinstance(val, (int, float)) else Decimal(str(val))
                except Exception:
                    try:
                        v = float(val)
                    except Exception:
                        v = 0
                return f"₦{float(v):,.2f}"

            order = transaction.order
            # Compute total value fallback
            total_value = getattr(order, "total_value", None)
            if total_value in (None, "", "null"):
                try:
                    total_value = (order.amount or 0) * (order.rate or 0)
                except Exception:
                    total_value = 0

            # Header
            y = height - 60
            p.setFillColor(colors.HexColor("#111827"))
            p.setFont("Helvetica-Bold", 18)
            p.drawString(50, y, "Vendora")
            p.setFont("Helvetica", 12)
            p.setFillColor(colors.HexColor("#6b7280"))
            p.drawString(120, y, "• Transaction Summary")
            hr(y - 10)
            y -= 35

            # Summary card
            p.setFillColor(colors.black)
            p.setFont("Helvetica-Bold", 12)
            p.drawString(50, y, f"Order: {order.order_code or order.id}")
            p.setFont("Helvetica", 10)
            y -= 16
            p.drawString(50, y, f"Vendor: {getattr(order.vendor, 'name', '')}")
            y -= 14
            p.drawString(50, y, f"Date: {str(getattr(order, 'created_at', '')).split('.')[0]}")
            y -= 20

            # Order details
            p.setFont("Helvetica-Bold", 12)
            p.drawString(50, y, "Order Details")
            y -= 12
            hr(y)
            y -= 16
            p.setFont("Helvetica", 10)
            p.drawString(50, y, f"Type: {order.type}")
            p.drawString(220, y, f"Asset: {order.asset}")
            y -= 14
            p.drawString(50, y, f"Amount: {order.amount}")
            p.drawString(220, y, f"Rate: {money(order.rate)}")
            y -= 14
            p.drawString(50, y, f"Total Value: {money(total_value)}")
            p.drawString(220, y, f"Order Status: {order.status}")
            y -= 20

            # Transaction details
            p.setFont("Helvetica-Bold", 12)
            p.drawString(50, y, "Transaction Details")
            y -= 12
            hr(y)
            y -= 16
            p.setFont("Helvetica", 10)
            p.drawString(50, y, f"Transaction Status: {transaction.status}")
            y -= 14
            p.drawString(50, y, f"Vendor Completed At: {str(transaction.vendor_completed_at or '')}")
            y -= 14
            p.drawString(50, y, f"Customer Completed At: {str(transaction.completed_at or '')}")
            y -= 20

            # Instructions (first line)
            p.setFont("Helvetica-Bold", 12)
            p.drawString(50, y, "Instructions")
            y -= 12
            hr(y)
            y -= 16
            p.setFont("Helvetica", 10)
            pay_line = (order.pay_instructions or '').splitlines()[0] if order.pay_instructions else ''
            send_line = (order.send_instructions or '').splitlines()[0] if order.send_instructions else ''
            if pay_line:
                p.drawString(50, y, f"Pay: {pay_line}")
                y -= 14
            if send_line:
                p.drawString(50, y, f"Send: {send_line}")
                y -= 14
            if not pay_line and not send_line:
                p.drawString(50, y, "No instructions available.")
                y -= 14

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
