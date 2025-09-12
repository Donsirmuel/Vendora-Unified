from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import Vendor
import re


def make_code_from(text: str, fallback: str) -> str:
    """Normalize text to allowed username/code: [a-z0-9_-], 3-64 chars.
    If empty after cleaning, use fallback.
    """
    if not text:
        text = ''
    base = re.sub(r'\s+', '_', text.strip().lower())
    base = re.sub(r'[^a-z0-9_\-]', '', base)
    if not base:
        base = fallback
    base = base[:64]
    if len(base) < 3:
        base = (base + (fallback or 'vendor'))[:3]
    return base


class Command(BaseCommand):
    help = "Backfill external_vendor_id for vendors that are missing it, ensuring uniqueness."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Print changes without saving')

    def handle(self, *args, **options):
        dry = bool(options.get('dry_run'))
        qs = Vendor.objects.filter(external_vendor_id__isnull=True) | Vendor.objects.filter(external_vendor_id='')
        qs = qs.distinct()
        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS('All vendors already have external_vendor_id.'))
            return

        self.stdout.write(f'Processing {total} vendors...')
        updated = 0
        with transaction.atomic():
            for v in qs.select_for_update():
                # Prefer name; fallback to email local-part; fallback to vendor<pk>
                base_txt = (v.name or '').strip()
                if not base_txt and v.email:
                    base_txt = v.email.split('@')[0]
                fallback = f'vendor{v.pk or ""}'
                code = make_code_from(base_txt, fallback)
                # Ensure uniqueness by adding suffix if needed
                candidate = code
                idx = 1
                while Vendor.objects.filter(external_vendor_id=candidate).exclude(pk=v.pk).exists():
                    suffix = f'-{idx}'
                    candidate = (code[: (64 - len(suffix))] + suffix)
                    idx += 1
                    if idx > 50:
                        candidate = f'vendor{v.pk}'
                        break
                self.stdout.write(f"{v.email}: {v.external_vendor_id!r} -> {candidate!r}")
                if not dry:
                    v.external_vendor_id = candidate
                    v.save(update_fields=['external_vendor_id'])
                    updated += 1

        if dry:
            self.stdout.write(self.style.WARNING('Dry run complete. No changes saved.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Updated {updated} vendors.'))
