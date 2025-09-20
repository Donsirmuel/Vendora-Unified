from django.contrib import admin
from django.utils import timezone
from datetime import timedelta
from .models import Vendor
from .models import PaymentRequest
from django import forms
from django.contrib import messages
from django.utils.translation import gettext_lazy as _
from django.conf import settings



@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
	list_display = ("email", "name", "telegram_username", "plan", "is_trial", "is_service_active", "trial_expires_at", "plan_expires_at")
	search_fields = ("email", "name", "external_vendor_id", "telegram_username")
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



@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
	list_display = ("vendor", "status", "created_at", "processed_at", "receipt_preview")
	list_filter = ("status",)
	actions = ("approve_payments", "reject_payments")

	# Action form shown above the actions in the admin changelist
	from django.contrib.admin.helpers import ActionForm

	class ApproveActionForm(ActionForm):
		duration_days = forms.IntegerField(required=False, min_value=1, label=_('Activation days (leave blank for perpetual)'),
										   initial=getattr(settings, 'ADMIN_APPROVAL_DEFAULT_DAYS', 30))

	action_form = ApproveActionForm

	@admin.action(description="Approve selected payments and activate vendor")
	def approve_payments(self, request, queryset):
		from django.utils import timezone
		# Admins may optionally pass 'duration_days' in the POST data when triggering this action via the
		# admin action form. If not provided, default to 30 days activation window.
		from django.conf import settings
		default_days = int(getattr(settings, 'ADMIN_APPROVAL_DEFAULT_DAYS', 30) or 30)
		# If the admin action form provided duration_days use it; otherwise use default
		try:
			if request.POST.get('duration_days'):
				duration_days = int(request.POST.get('duration_days'))
			else:
				duration_days = default_days
		except Exception:
			duration_days = default_days
		count = 0
		for pr in queryset:
			if pr.status != 'approved':
				pr.status = 'approved'
				pr.processed_at = timezone.now()
				pr.processed_by = request.user
				pr.save(update_fields=['status','processed_at','processed_by'])
				# Activate vendor service for duration_days
				vendor = pr.vendor
				vendor.is_service_active = True
				vendor.is_trial = False
				vendor.plan = 'monthly'
				vendor.plan_expires_at = timezone.now() + timedelta(days=duration_days)
				vendor.save(update_fields=['is_service_active','is_trial','plan','plan_expires_at'])
				count += 1
		self.message_user(request, f"Approved and activated {count} payment(s) for {duration_days} days")

	@admin.action(description="Reject selected payments")
	def reject_payments(self, request, queryset):
		count = queryset.update(status='rejected')
		self.message_user(request, f"Rejected {count} payment(s)")

	def receipt_preview(self, obj):
		try:
			if not obj.receipt:
				return "-"
			url = obj.receipt.url
			name = getattr(obj.receipt, 'name', '')
			from django.utils.safestring import mark_safe
			lower = str(name).lower()
			if lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
				return mark_safe(f'<a href="{url}" target="_blank"><img src="{url}" style="max-height:80px;max-width:160px;object-fit:contain;"/></a>')
			return mark_safe(f'<a href="{url}" target="_blank">View receipt</a>')
		except Exception:
			return "-"
	receipt_preview.short_description = "Receipt"
	readonly_fields = ('receipt_preview',)


from .models import GlobalPaymentDestination


@admin.register(GlobalPaymentDestination)
class GlobalPaymentDestinationAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "is_active", "created_at")
    list_filter = ("kind", "is_active")
    search_fields = ("name", "details")
