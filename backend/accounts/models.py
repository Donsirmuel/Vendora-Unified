from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from typing import Any, cast
from django.conf import settings
# Create your models here.

class VendorManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        vendor = self.model(email=email, **extra_fields)
        vendor.set_password(password)
        vendor.save(using=self._db)
        return vendor

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)

# Vendor model (custom user)
class Vendor(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    bank_details = models.TextField(blank=True)
    # Optional per-vendor override for how many minutes before a pending order auto-expires.
    # If null/blank, fallback to global settings.ORDER_AUTO_EXPIRE_MINUTES.
    auto_expire_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_available = models.BooleanField(default=cast(Any, True))
    is_staff = models.BooleanField(default=cast(Any, False))
    is_superuser = models.BooleanField(default=cast(Any, False))
    is_active = models.BooleanField(default=cast(Any, True))

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = VendorManager()

    def __str__(self):
        return self.email


class BankDetail(models.Model):
    """Per-vendor saved bank/payment details to share with customers on BUY orders."""
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bank_details_list")
    bank_name = models.CharField(max_length=120)
    account_number = models.CharField(max_length=64)
    account_name = models.CharField(max_length=120)
    instructions = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name = "Bank Detail"
        verbose_name_plural = "Bank Details"

    def __str__(self) -> str:
        return f"{self.bank_name} • {self.account_number} ({self.account_name})"


class BroadcastMessage(models.Model):
    """Broadcast messages sent by vendors to their Telegram bot."""
    MESSAGE_TYPES = [
        ("asset_added", "Asset Added"),
        ("rate_updated", "Rate Updated"),
        ("order_status", "Order Status"),
        ("general", "General"),
    ]

    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="broadcasts")
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default="general")
    title = models.CharField(max_length=100)
    content = models.TextField()
    is_sent = models.BooleanField(default=cast(Any, False))
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.message_type}: {self.title} by {self.vendor.name}"