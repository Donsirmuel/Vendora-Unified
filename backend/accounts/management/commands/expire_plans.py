from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import Vendor

class Command(BaseCommand):
    help = 'Expire vendor plans that have passed their plan_expires_at and set is_service_active=False'

    def handle(self, *args, **options):
        now = timezone.now()
        qs = Vendor.objects.filter(plan_expires_at__isnull=False, plan_expires_at__lt=now, is_service_active=True)
        count = 0
        for v in qs:
            v.is_service_active = False
            v.plan = 'none'
            v.save(update_fields=['is_service_active','plan'])
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Expired {count} vendor plans'))
