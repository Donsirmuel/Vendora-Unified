from django.db import models
from django.conf import settings
# Create your models here.
class Order(models.Model):
    BUY = "buy"
    SELL = "sell"
    ORDER_TYPES = [(BUY, "Buy"), (SELL, "Sell")]

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    COMPLETED = "completed"
    STATUS_CHOICES = [
        (PENDING, "Pending"), 
        (ACCEPTED, "Accepted"), 
        (DECLINED, "Declined"),
        (EXPIRED, "Expired"),
        (COMPLETED, "Completed")
    ]

    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    order_code = models.CharField(max_length=32, unique=True, blank=True)
    customer_chat_id = models.CharField(max_length=64, blank=True)  # Telegram chat ID
    customer_name = models.CharField(max_length=100, blank=True)   # Customer name from Telegram
    pay_instructions = models.TextField(blank=True)   # bank details for buy
    send_instructions = models.TextField(blank=True)  # contract address for sell
    asset = models.CharField(max_length=50)
    type = models.CharField(max_length=10, choices=ORDER_TYPES)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    rate = models.DecimalField(max_digits=20, decimal_places=2)
    total_value = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)  # amount * rate
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    auto_expire_at = models.DateTimeField(null=True, blank=True)  # Auto expiry time
    rejection_reason = models.TextField(blank=True)  # Reason for decline
    acceptance_note = models.TextField(blank=True)   # Note on acceptance
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Auto-calculate total value
        if self.amount and self.rate:
            self.total_value = self.amount * self.rate
        # Ensure auto_expire_at for pending orders
        if self.status == self.PENDING and not self.auto_expire_at:
            try:
                from django.utils import timezone
                from datetime import timedelta
                # Prefer vendor-specific override if present; else fallback to global setting
                vendor_ttl = None
                try:
                    vendor_ttl = int(getattr(self.vendor, "auto_expire_minutes", None) or 0)
                except Exception:
                    vendor_ttl = None
                ttl_min = vendor_ttl or int(getattr(settings, "ORDER_AUTO_EXPIRE_MINUTES", 30) or 30)
                # created_at may not exist until first save; use now for initial
                base_time = self.created_at or timezone.now()
                self.auto_expire_at = base_time + timedelta(minutes=ttl_min)
            except Exception:
                pass
        # Generate order_code once
        if not self.order_code:
            from django.utils import timezone
            from django.db.models import Count
            today = timezone.localdate()
            type_code = "01" if self.type == self.BUY else "02"
            day_str = today.strftime("%d%m%Y")
            # Daily count for this vendor and day
            today_count = Order.objects.filter(vendor=self.vendor, created_at__date=today).count() + 1
            seq = f"{today_count:02d}"
            self.order_code = f"ORD{type_code}{day_str}{seq}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{str(self.type).upper()} {self.asset} @ {self.rate}"