from django.db import models
from django.conf import settings
from typing import Any, cast


class BotUser(models.Model):
    chat_id = models.CharField(max_length=64, unique=True)
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    is_subscribed = models.BooleanField(default=cast(Any, True))
    state = models.CharField(max_length=32, blank=True)
    temp_type = models.CharField(max_length=8, blank=True)  # buy/sell
    temp_asset = models.CharField(max_length=50, blank=True)
    temp_amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    temp_order_id = models.CharField(max_length=64, blank=True)
    # Used to keep state for general question flow via Telegram
    temp_query_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"BotUser {self.chat_id} -> {self.vendor.name if self.vendor else 'No Vendor'}"


