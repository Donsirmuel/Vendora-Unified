from datetime import timedelta
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.db.models.functions import TruncDate
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from orders.models import Order
        from transactions.models import Transaction
        from queries.models import Query
        from accounts.models import BroadcastMessage

        user = request.user

        order_counts = Order.objects.filter(vendor=user).aggregate(
            pending=Count("id", filter=Q(status=Order.PENDING)),
            accepted=Count("id", filter=Q(status=Order.ACCEPTED)),
            declined=Count("id", filter=Q(status=Order.DECLINED)),
            completed=Count("id", filter=Q(status=Order.COMPLETED)),
        )

        tx_agg = Transaction.objects.filter(order__vendor=user).aggregate(
            completed_count=Count("id", filter=Q(status="completed")),
            total_revenue=Coalesce(Sum("order__total_value", filter=Q(status="completed")), 0),
        )

        pending_queries_qs = Query.objects.filter(
            Q(vendor=user) | Q(order__vendor=user)
        ).filter(
            Q(status="pending") | Q(reply__isnull=True) | Q(reply="")
        )

        pending_queries_count = pending_queries_qs.count()

        recent_orders_qs = (
            Order.objects.filter(vendor=user, status=Order.PENDING)
            .order_by("-created_at")
            .values("id", "order_code", "asset", "type", "amount", "rate", "total_value", "status", "created_at")[:3]
        )

        recent_transactions_qs = (
            Transaction.objects.filter(order__vendor=user, status="uncompleted")
            .order_by("-created_at")
            .values(
                "id",
                "status",
                "created_at",
                "completed_at",
                "order_id",
                "order__order_code",
                "order__type",
                "order__asset",
                "order__amount",
                "order__total_value",
            )[:3]
        )

        recent_queries_qs = (
            pending_queries_qs.order_by("-timestamp")
            .values("id", "message", "contact", "status", "timestamp")[:3]
        )

        today = timezone.localdate()
        start_date = today - timedelta(days=13)
        tx_by_day_qs = (
            Transaction.objects.filter(order__vendor=user, status="completed", completed_at__date__gte=start_date)
            .annotate(day=TruncDate("completed_at"))
            .values("day")
            .annotate(
                count=Count("id"),
                revenue=Coalesce(Sum("order__total_value"), 0),
            )
            .order_by("day")
        )

        tx_by_day = {
            row["day"].isoformat(): {
                "count": int(row.get("count") or 0),
                "revenue": float(row.get("revenue") or 0),
            }
            for row in tx_by_day_qs
            if row.get("day")
        }

        daily_completed = []
        for i in range(14):
            day = start_date + timedelta(days=i)
            key = day.isoformat()
            daily_completed.append(
                {
                    "date": key,
                    "count": tx_by_day.get(key, {}).get("count", 0),
                    "revenue": tx_by_day.get(key, {}).get("revenue", 0.0),
                }
            )

        recent_broadcasts_qs = (
            BroadcastMessage.objects.filter(vendor=user)
            .order_by("-created_at")
            .values("id", "title", "content", "message_type", "is_sent", "created_at")[:2]
        )

        recent_transactions = [
            {
                "id": tx.get("id"),
                "status": tx.get("status"),
                "created_at": tx.get("created_at"),
                "completed_at": tx.get("completed_at"),
                "order": tx.get("order_id"),
                "order_code": tx.get("order__order_code"),
                "order_type": tx.get("order__type"),
                "order_asset": tx.get("order__asset"),
                "order_amount": tx.get("order__amount"),
                "order_total_value": tx.get("order__total_value"),
            }
            for tx in recent_transactions_qs
        ]

        payload = {
            "profile": {
                "currency": getattr(user, "currency", "USD") or "USD",
                "telegram_username": getattr(user, "telegram_username", None),
                "bot_link": (
                    f"https://t.me/{str(getattr(settings, 'TELEGRAM_BOT_USERNAME', '') or '').strip()}?start=vendor_{getattr(user, 'external_vendor_id', None) or user.id}"
                    if str(getattr(settings, 'TELEGRAM_BOT_USERNAME', '') or '').strip()
                    else None
                ),
            },
            "stats": {
                "total_orders_received": (order_counts.get("accepted") or 0) + (order_counts.get("declined") or 0),
                "pending_orders": order_counts.get("pending") or 0,
                "completed_orders": order_counts.get("completed") or 0,
                "total_revenue": float(tx_agg.get("total_revenue") or 0),
                "completed_transactions": tx_agg.get("completed_count") or 0,
                "pending_queries": pending_queries_count,
            },
            "recent": {
                "orders": list(recent_orders_qs),
                "transactions": recent_transactions,
                "queries": list(recent_queries_qs),
                "broadcasts": list(recent_broadcasts_qs),
            },
            "insights": {
                "daily_completed": daily_completed,
            },
        }

        return Response(payload)
