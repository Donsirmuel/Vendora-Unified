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
        # Optional status filter via query param
        try:
            status_param = (self.request.GET.get("status") or "").strip()
            if status_param:
                qs = qs.filter(status=status_param)
        except Exception:
            pass
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
        # Optionally override instructions from request
        pay_instructions = request.data.get("pay_instructions")
        send_instructions = request.data.get("send_instructions")
        
        order.status = Order.ACCEPTED
        order.acceptance_note = acceptance_note
        # Set instructions: prefer vendor's default BankDetail for BUY, or Rate.contract_address for SELL, if not provided
        if not pay_instructions and not send_instructions:
            try:
                if order.type == Order.BUY:
                    # Prefer default saved bank detail
                    from accounts.models import BankDetail
                    bd = BankDetail._default_manager.filter(vendor=order.vendor).order_by('-is_default','-created_at').first()
                    if bd:
                        order.pay_instructions = (f"Bank: {bd.bank_name}\nAccount Name: {bd.account_name}\nAccount Number: {bd.account_number}\n" + (f"Instructions: {bd.instructions}" if bd.instructions else ""))
                    else:
                        from rates.models import Rate
                        rate = Rate._default_manager.get(vendor=order.vendor, asset=order.asset)
                        order.pay_instructions = rate.bank_details or order.pay_instructions
                else:
                    from rates.models import Rate
                    rate = Rate._default_manager.get(vendor=order.vendor, asset=order.asset)
                    order.send_instructions = rate.contract_address or order.send_instructions
            except Exception:
                pass
        if pay_instructions is not None:
            order.pay_instructions = pay_instructions
        if send_instructions is not None:
            order.send_instructions = send_instructions
        order.save(update_fields=["status", "acceptance_note", "pay_instructions", "send_instructions"])
        
        # Ensure a transaction exists and is set to 'uncompleted' for vendor processing
        try:
            from transactions.models import Transaction
            txn, created = Transaction._default_manager.get_or_create(order=order, defaults={"status": "uncompleted"})
            if not created and txn.status not in {"uncompleted", "declined", "completed"}:
                txn.status = "uncompleted"
                txn.save(update_fields=["status"])
        except Exception:
            pass
        
        # Notify customer via Telegram
        try:
            if order.customer_chat_id:
                from api.telegram_service import TelegramBotService
                tgs = TelegramBotService()
                msg = (
                    f"✅ Order {order.order_code or order.id} accepted\n\n"
                    f"Asset: {order.asset}\nType: {order.type}\nAmount: {order.amount}\nRate: {order.rate}\n"
                )
                if order.type == Order.BUY and order.pay_instructions:
                    msg += f"\nPayment Details:\n{order.pay_instructions}"
                if order.type == Order.SELL and order.send_instructions:
                    msg += f"\nSend to:\n{order.send_instructions}"
                if acceptance_note:
                    msg += f"\n\nNote: {acceptance_note}"
                tgs.send_message(msg, chat_id=str(order.customer_chat_id))
        except Exception:
            pass

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
        
        # Create a declined transaction entry for read-only history
        try:
            from transactions.models import Transaction
            Transaction._default_manager.get_or_create(order=order, defaults={"status": "declined"})
        except Exception:
            pass
        
        # Notify customer via Telegram
        try:
            if order.customer_chat_id:
                from api.telegram_service import TelegramBotService
                tgs = TelegramBotService()
                msg = (
                    f"❌ Order {order.order_code or order.id} declined.\n\nReason: {rejection_reason}"
                )
                tgs.send_message(msg, chat_id=str(order.customer_chat_id))
        except Exception:
            pass
        
        # Serialize the updated order
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="expire-overdue")
    def expire_overdue(self, request):
        from django.utils import timezone
        from .models import Order

        now = timezone.now()
        vendor = request.user
        if not vendor.is_authenticated:
            return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        qs = Order.objects.filter(vendor=vendor, status=Order.PENDING, auto_expire_at__isnull=False, auto_expire_at__lt=now)
        updated = 0
        for order in qs.iterator():
            order.status = Order.EXPIRED
            order.save(update_fields=["status"])
            # Notify customer via Telegram
            try:
                if order.customer_chat_id:
                    from api.telegram_service import TelegramBotService
                    TelegramBotService().send_message(f"⏰ Order {order.order_code or order.pk} has expired.", chat_id=str(order.customer_chat_id))
            except Exception:
                pass
            updated += 1
        return Response({"expired": updated}, status=status.HTTP_200_OK)
