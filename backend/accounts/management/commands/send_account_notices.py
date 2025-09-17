from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from accounts.models import Vendor, NotificationLog
from accounts.emails import (
    send_trial_ending_email, send_trial_expired_email,
    send_plan_expiring_email
)

NOTICE_WINDOW_DAYS = 3

class Command(BaseCommand):
    help = "Send trial and plan expiry notices (idempotent)."

    def handle(self, *args, **options):
        now = timezone.now()
        soon = now + timezone.timedelta(days=NOTICE_WINDOW_DAYS)
        count = 0
        # Trial ending soon
        trials_soon = Vendor.objects.filter(is_trial=True, trial_expires_at__range=(now, soon))
        for v in trials_soon:
            if not NotificationLog.objects.filter(vendor=v, kind='trial_ending').exists():
                days_left = (v.trial_expires_at - now).days if v.trial_expires_at else NOTICE_WINDOW_DAYS
                send_trial_ending_email(v, max(days_left,1))
                NotificationLog.objects.create(vendor=v, kind='trial_ending')
                count += 1
        # Trial expired
        expired_trials = Vendor.objects.filter(is_trial=True, trial_expires_at__lt=now)
        for v in expired_trials:
            if not NotificationLog.objects.filter(vendor=v, kind='trial_expired').exists():
                send_trial_expired_email(v)
                NotificationLog.objects.create(vendor=v, kind='trial_expired')
                count += 1
        # Plan ending soon
        plans_soon = Vendor.objects.filter(is_trial=False, plan__in=['monthly','yearly'], plan_expires_at__range=(now, soon))
        for v in plans_soon:
            if not NotificationLog.objects.filter(vendor=v, kind='plan_ending').exists():
                days_left = (v.plan_expires_at - now).days if v.plan_expires_at else NOTICE_WINDOW_DAYS
                send_plan_expiring_email(v, max(days_left,1))
                NotificationLog.objects.create(vendor=v, kind='plan_ending')
                count += 1
        # Plan expired
        plan_expired = Vendor.objects.filter(is_trial=False, plan__in=['monthly','yearly'], plan_expires_at__lt=now)
        for v in plan_expired:
            if not NotificationLog.objects.filter(vendor=v, kind='plan_expired').exists():
                NotificationLog.objects.create(vendor=v, kind='plan_expired')
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Notices processed: {count}"))