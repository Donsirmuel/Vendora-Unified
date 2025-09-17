from django.db import models
from django.conf import settings
from orders.models import Order
from django.utils import timezone


class Query(models.Model):
    # Order-specific queries remain supported, but order is now optional for general questions
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=True, blank=True)
    # Direct vendor association for general questions without a specific order
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    contact = models.TextField(blank=True)  # phone/email/Telegram handle to reach the customer
    reply = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    # Tracking + status
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("replied", "Replied"),
        ("resolved", "Resolved"),
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    customer_chat_id = models.CharField(max_length=64, blank=True)
    notified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        oid = getattr(self, "order_id", None)
        if oid:
            code = getattr(self.order, "order_code", None)
            return f"Query on Order #{code or oid}"
        vid = getattr(self, "vendor_id", None)
        return f"General Query for Vendor #{vid or 'N/A'}"

    class Meta:
        # Default ordering ensures stable pagination and newest-first display
        ordering = ["-timestamp", "id"]