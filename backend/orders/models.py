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
    customer_chat_id = models.CharField(max_length=64, blank=True)  # Telegram chat ID
    customer_name = models.CharField(max_length=100, blank=True)   # Customer name from Telegram
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
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{str(self.type).upper()} {self.asset} @ {self.rate}"