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