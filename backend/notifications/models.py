from django.db import models
from django.conf import settings
from typing import Any, cast

# Create your models here.
class Notification(models.Model):
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=100)
    message = models.TextField()
    is_read = models.BooleanField(default=cast(Any, False))
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class PushSubscription(models.Model):
    """Stores Web Push subscriptions per vendor device/browser."""
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    user_agent = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"PushSub for {self.vendor} @ {self.endpoint[:32]}…"
