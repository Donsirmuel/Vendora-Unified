from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from typing import Optional

DEF_FROM = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')

def _send(subject: str, body: str, to: str):
    try:
        send_mail(subject, body, DEF_FROM, [to], fail_silently=True)
    except Exception:
        pass

def send_trial_ending_email(vendor, days_left: int):
    _send(
        "Your trial is ending soon",
        f"Hi {vendor.name}, your trial ends in {days_left} day(s). Upgrade to keep your access.",
        vendor.email,
    )

def send_trial_expired_email(vendor):
    _send(
        "Your trial has expired",
        f"Hi {vendor.name}, your trial has expired. Upgrade to continue using the platform.",
        vendor.email,
    )

def send_plan_changed_email(vendor, old_plan: str, new_plan: str):
    _send(
        "Plan updated",
        f"Hi {vendor.name}, your plan changed from {old_plan} to {new_plan}.",
        vendor.email,
    )

def send_plan_expiring_email(vendor, days_left: int):
    _send(
        "Plan expiring soon",
        f"Hi {vendor.name}, your {vendor.plan} plan expires in {days_left} day(s). Renew to avoid interruption.",
        vendor.email,
    )