from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order
import time

class Command(BaseCommand):
    help = "Auto-expire pending orders past their auto_expire_at and notify customers"

    def add_arguments(self, parser):
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Continuously watch and expire orders precisely when they reach auto_expire_at.",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=5,
            help="Polling interval in seconds when watching (default: 5).",
        )

    def expire_once(self) -> int:
        now = timezone.now()
        qs = Order.objects.filter(status=Order.PENDING, auto_expire_at__isnull=False, auto_expire_at__lte=now)
        count = 0
        for order in qs.iterator():
            order.status = Order.EXPIRED
            order.save(update_fields=["status"])
            # create a transaction record for expired for list/history
            try:
                from transactions.models import Transaction
                Transaction._default_manager.get_or_create(order=order, defaults={"status": "expired"})
            except Exception:
                pass
            # try notify customer
            try:
                if order.customer_chat_id:
                    from api.telegram_service import TelegramBotService
                    TelegramBotService().send_message(
                        f"⏰ Order {order.order_code or order.pk} has expired.",
                        chat_id=str(order.customer_chat_id),
                    )
            except Exception:
                pass
            count += 1
        return count

    def handle(self, *args, **options):
        watch = bool(options.get("watch", False))
        interval = int(options.get("interval") or 5)
        if not watch:
            count = self.expire_once()
            self.stdout.write(self.style.SUCCESS(f"Expired {count} orders."))
            return

        self.stdout.write(self.style.WARNING(f"Watching for order expiries every {interval}s... (Ctrl+C to stop)"))
        try:
            while True:
                count = self.expire_once()
                if count:
                    self.stdout.write(self.style.SUCCESS(f"Expired {count} orders."))
                time.sleep(max(1, interval))
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Stopped watching."))
