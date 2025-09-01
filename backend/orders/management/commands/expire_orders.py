from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order

class Command(BaseCommand):
    help = "Auto-expire pending orders past their auto_expire_at and notify customers"

    def handle(self, *args, **options):
        now = timezone.now()
        qs = Order.objects.filter(status=Order.PENDING, auto_expire_at__isnull=False, auto_expire_at__lt=now)
        count = 0
        for order in qs.iterator():
            order.status = Order.EXPIRED
            order.save(update_fields=["status"])
            # try notify customer
            try:
                if order.customer_chat_id:
                    from api.telegram_service import TelegramBotService
                    tgs = TelegramBotService()
                    tgs.send_message(f"⏰ Order {order.order_code or order.pk} has expired.", chat_id=str(order.customer_chat_id))
            except Exception:
                pass
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Expired {count} orders."))
