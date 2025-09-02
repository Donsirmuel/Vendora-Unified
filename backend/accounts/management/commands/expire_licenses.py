from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import Vendor


class Command(BaseCommand):
    help = "Disable service for vendors whose trial or subscription expired"

    def handle(self, *args, **options):
        now = timezone.now()
        # Expire trials
        trials = Vendor.objects.filter(is_trial=True, trial_expires_at__isnull=False, trial_expires_at__lt=now, is_service_active=True)
        tcount = trials.update(is_service_active=False)
        # Expire paid subscriptions
        subs = Vendor.objects.filter(is_trial=False, plan__in=["monthly", "yearly"], plan_expires_at__isnull=False, plan_expires_at__lt=now, is_service_active=True)
        scount = subs.update(is_service_active=False)
        self.stdout.write(self.style.SUCCESS(f"Expired: trials={tcount}, subs={scount}"))
