from django.contrib import admin
from django.utils import timezone
from datetime import timedelta
from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
	list_display = ("email", "name", "plan", "is_trial", "is_service_active", "trial_expires_at", "plan_expires_at")
	search_fields = ("email", "name", "external_vendor_id")
	list_filter = ("is_trial", "plan", "is_service_active")
	actions = ("start_5_day_trial", "activate_monthly", "activate_yearly", "activate_perpetual", "revoke_service", "generate_external_ids")

	@admin.action(description="Start 5-day trial (active)")
	def start_5_day_trial(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=5)
		count = queryset.update(
			is_trial=True,
			trial_started_at=now,
			trial_expires_at=expires,
			plan="trial",
			plan_expires_at=None,
			is_service_active=True,
		)
		self.message_user(request, f"Started 5-day trial for {count} vendors")

	@admin.action(description="Activate Monthly (30 days)")
	def activate_monthly(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=30)
		count = queryset.update(
			is_trial=False,
			plan="monthly",
			plan_expires_at=expires,
			is_service_active=True,
		)
		self.message_user(request, f"Activated monthly plan for {count} vendors")

	@admin.action(description="Activate Yearly (365 days)")
	def activate_yearly(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=365)
		count = queryset.update(
			is_trial=False,
			plan="yearly",
			plan_expires_at=expires,
			is_service_active=True,
		)
		self.message_user(request, f"Activated yearly plan for {count} vendors")

	@admin.action(description="Activate Perpetual (no expiry)")
	def activate_perpetual(self, request, queryset):
		count = queryset.update(
			is_trial=False,
			plan="perpetual",
			plan_expires_at=None,
			is_service_active=True,
		)
		self.message_user(request, f"Activated perpetual plan for {count} vendors")

	@admin.action(description="Revoke Service (disable bot + app actions)")
	def revoke_service(self, request, queryset):
		count = queryset.update(is_service_active=False)
		self.message_user(request, f"Revoked service for {count} vendors")

	@admin.action(description="Generate external vendor IDs (vendor_xxx)")
	def generate_external_ids(self, request, queryset):
		import secrets
		updated = 0
		for v in queryset:
			if not v.external_vendor_id:
				v.external_vendor_id = f"v_{secrets.token_urlsafe(6)}"
				v.save(update_fields=["external_vendor_id"])
				updated += 1
		self.message_user(request, f"Generated IDs for {updated} vendors")
