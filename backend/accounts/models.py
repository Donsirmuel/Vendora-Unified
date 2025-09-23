from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from typing import Any, cast
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
# Create your models here.

class VendorManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        # tolerate stray 'username' from tests/legacy code
        extra_fields.pop('username', None)
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        
        # Default to trial if not explicitly provided (helps tests using create_user)
        if 'is_trial' not in extra_fields and 'trial_expires_at' not in extra_fields:
            days = int(getattr(settings, 'TRIAL_DAYS', 14))
            extra_fields['is_trial'] = True
            extra_fields['trial_expires_at'] = timezone.now() + timedelta(days=days)

        vendor = self.model(email=email, **extra_fields)
        vendor.set_password(password)
        vendor.save(using=self._db)
        return vendor

    def create_superuser(self, email, password=None, **extra_fields):
         # tolerate stray 'username' from tests/legacy code
        extra_fields.pop('username', None)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)

# Vendor model (custom user)
class Vendor(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    # Optional Telegram username (without @) to allow customers to DM vendor directly from the bot
    telegram_username = models.CharField(max_length=64, null=True, blank=True)
    # Optional short bio/tagline shown in bot and public profile
    bio = models.TextField(blank=True)
    # Non-custodial wallet metadata (future DEX linking; informational only)
    wallet_address = models.CharField(max_length=128, null=True, blank=True)
    wallet_chain = models.CharField(max_length=32, null=True, blank=True)
    bank_details = models.TextField(blank=True)
    # Optional per-vendor override for how many minutes before a pending order auto-expires.
    # If null/blank, fallback to global settings.ORDER_AUTO_EXPIRE_MINUTES.
    auto_expire_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_available = models.BooleanField(default=cast(Any, True))
    # When enabled, the vendor opts in to auto-accept flows from the bot.
    # The bot will auto-create a transaction and present payment details to the customer.
    auto_accept = models.BooleanField(default=cast(Any, False))
    unavailable_message = models.TextField(blank=True)
    is_staff = models.BooleanField(default=cast(Any, False))
    is_superuser = models.BooleanField(default=cast(Any, False))
    is_active = models.BooleanField(default=cast(Any, True))

    # Manual subscription/trial controls (no automated billing)
    is_trial = models.BooleanField(default=cast(Any, True))
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_expires_at = models.DateTimeField(null=True, blank=True)
    PLAN_CHOICES = [
        ("trial", "Trial"),
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
        ("perpetual", "Perpetual"),
        ("none", "None"),
    ]
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="trial")
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    # Service gate separate from Django is_active (login)
    is_service_active = models.BooleanField(default=cast(Any, True))
    # Public ID used by customers to connect via bot (/start vendor_<idOrCode>)
    external_vendor_id = models.CharField(max_length=64, null=True, blank=True, unique=True)
    # Optional manual crypto payment metadata
    last_payment_provider = models.CharField(max_length=50, null=True, blank=True)
    last_payment_currency = models.CharField(max_length=16, null=True, blank=True)
    last_payment_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    last_payment_network = models.CharField(max_length=32, null=True, blank=True)
    last_payment_tx_hash = models.CharField(max_length=120, null=True, blank=True)
    last_payment_confirmed_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = VendorManager()

    def __str__(self):
        return self.email

    # Plan utility
    def set_plan(self, plan: str, duration_days: int | None = None):
        from django.utils import timezone
        old_plan = self.plan
        self.plan = plan
        self.is_trial = False if plan != 'trial' else True
        if duration_days:
            self.plan_expires_at = timezone.now() + timezone.timedelta(days=duration_days)
        self.save(update_fields=["plan","is_trial","plan_expires_at"])
        try:
            from .emails import send_plan_changed_email
            send_plan_changed_email(self, str(old_plan), plan)
        except Exception:
            pass

class NotificationLog(models.Model):
    KIND_CHOICES = [
        ("trial_ending", "Trial Ending Soon"),
        ("trial_expired", "Trial Expired"),
        ("plan_ending", "Plan Ending Soon"),
        ("plan_expired", "Plan Expired"),
    ]
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_logs")
    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("vendor","kind")
        ordering = ["-created_at"]

    def __str__(self):  # pragma: no cover
        return f"{self.vendor_id}:{self.kind}" if hasattr(self.vendor, "id") else f"{self.vendor}:{self.kind}"

    @property
    def vendor_id(self):
        return self.vendor_id if hasattr(self, "vendor_id") else self.vendor

class BankDetail(models.Model):
    """Per-vendor saved bank/payment details to share with customers on BUY orders."""
    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bank_details_list")
    bank_name = models.CharField(max_length=120)
    account_number = models.CharField(max_length=64)
    account_name = models.CharField(max_length=120)
    instructions = models.TextField(blank=True)
    is_default = models.BooleanField(default=cast(Any, False))
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


class PaymentRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    vendor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payment_requests")
    receipt = models.FileField(upload_to="payment_receipts/", null=True, blank=True)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="processed_payments")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PaymentRequest:{self.vendor.id}:{self.status}:{self.created_at.isoformat()}"


class GlobalPaymentDestination(models.Model):
    """Owner-managed payment destinations shown to vendors when they want to upgrade.

    Use the admin UI to add bank details or crypto addresses. These are not tied to a vendor.
    """
    KIND_CHOICES = [
        ("bank", "Bank Account"),
        ("crypto", "Crypto Address"),
        ("other", "Other"),
    ]
    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="bank")
    details = models.TextField(help_text="Full details to show to vendors (account number, instructions, address, memo, etc.)")
    is_active = models.BooleanField(default=cast(Any, True))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_active", "-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.kind})"