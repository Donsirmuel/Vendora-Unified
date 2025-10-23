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
	list_display = ("email", "name", "telegram_username", "plan", "is_trial", "is_service_active", "daily_orders_count", "daily_order_limit", "daily_order_limit_display", "trial_expires_at", "plan_expires_at")
	list_editable = ("daily_orders_count","daily_order_limit")
	search_fields = ("email", "name", "external_vendor_id", "telegram_username")
	list_filter = ("is_trial", "plan", "is_service_active", "daily_orders_date")
	actions = ("start_14_day_trial", "activate_free_plan", "activate_monthly", "activate_quarterly", "activate_semi_annual", "activate_yearly", "activate_perpetual", "revoke_service", "reset_daily_orders", "generate_external_ids")
	# Add action form for custom plan/duration and custom daily limit
	from django.contrib.admin.helpers import ActionForm

	class CustomActionForm(ActionForm):
		custom_plan = forms.ChoiceField(required=False, choices=(('', '---'), ('none','Free'), ('monthly','Monthly'), ('quarterly','3-Month'), ('semi-annual','6-Month'), ('yearly','Annual'), ('perpetual','Perpetual')))
		duration_days = forms.IntegerField(required=False, min_value=0, label=_('Activation days (0 for perpetual)'))
		custom_daily_limit = forms.IntegerField(required=False, min_value=-1, label=_('Custom daily limit (-1 for unlimited)'))

	action_form = CustomActionForm
	readonly_fields = ("daily_order_limit_display", "plan_status_display")
	
	fieldsets = (
		("Basic Info", {
			"fields": ("email", "name", "avatar", "telegram_username", "bio", "external_vendor_id")
		}),
		("Plan & Billing", {
			"fields": ("plan", "is_trial", "trial_started_at", "trial_expires_at", "plan_expires_at", "plan_status_display")
		}),
		("Daily Limits (Free Plan)", {
				"fields": ("daily_orders_count", "daily_orders_date", "daily_order_limit", "daily_order_limit_display"),
			"description": "Free plan users are limited to 10 orders per day. This counter resets daily."
		}),
		("Service Status", {
			"fields": ("is_service_active", "is_available", "unavailable_message", "auto_accept")
		}),
		("Bank & Payment", {
			"fields": ("bank_details", "wallet_address", "wallet_chain", "auto_expire_minutes")
		}),
		("System", {
			"fields": ("is_staff", "is_superuser", "is_active", "last_login"),
			"classes": ("collapse",)
		})
	)
	
	def daily_order_limit_display(self, obj):
		limit = obj.get_daily_order_limit()
		if limit == -1:
			return "Unlimited"
		return f"{limit} orders/day"
	daily_order_limit_display.short_description = "Daily Limit"
	
	def plan_status_display(self, obj):
		from django.utils.html import format_html
		from django.utils import timezone
		
		now = timezone.now()
		status = "Active"
		color = "green"
		
		if obj.is_trial and obj.trial_expires_at:
			if obj.trial_expires_at < now:
				status = "Trial Expired"
				color = "red"
			else:
				days_left = (obj.trial_expires_at - now).days
				status = f"Trial ({days_left} days left)"
				color = "orange" if days_left <= 3 else "blue"
		elif obj.plan_expires_at:
			if obj.plan_expires_at < now:
				status = "Plan Expired"
				color = "red"
			else:
				days_left = (obj.plan_expires_at - now).days
				status = f"Active ({days_left} days left)"
				color = "orange" if days_left <= 7 else "green"
		
		return format_html(
			'<span style="color: {}; font-weight: bold;">{}</span>',
			color, status
		)
	plan_status_display.short_description = "Status"

	@admin.action(description="Start 14-day trial (active)")
	def start_14_day_trial(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=14)
		count = queryset.update(
			is_trial=True,
			trial_started_at=now,
			trial_expires_at=expires,
			plan="trial",
			plan_expires_at=None,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Started 14-day trial for {count} vendors")
	
	@admin.action(description="Activate Free Plan (10 orders/day)")
	def activate_free_plan(self, request, queryset):
		count = queryset.update(
			is_trial=False,
			plan="none",
			plan_expires_at=None,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Activated free plan for {count} vendors")

	@admin.action(description="Activate Monthly Plan ($22.99/month)")
	def activate_monthly(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=30)
		count = queryset.update(
			is_trial=False,
			plan="monthly",
			plan_expires_at=expires,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Activated monthly plan for {count} vendors")

	@admin.action(description="Activate 3-Month Plan ($68.97/3 months)")
	def activate_quarterly(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=90)
		count = queryset.update(
			is_trial=False,
			plan="quarterly",
			plan_expires_at=expires,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Activated 3-month plan for {count} vendors")

	@admin.action(description="Activate 6-Month Plan ($137.94/6 months)")
	def activate_semi_annual(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=180)
		count = queryset.update(
			is_trial=False,
			plan="semi-annual",
			plan_expires_at=expires,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Activated 6-month plan for {count} vendors")

	@admin.action(description="Activate Annual Plan ($275.88/year)")
	def activate_yearly(self, request, queryset):
		now = timezone.now()
		expires = now + timedelta(days=365)
		count = queryset.update(
			is_trial=False,
			plan="yearly",
			plan_expires_at=expires,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Activated annual plan for {count} vendors")

	@admin.action(description="Activate Perpetual (no expiry)")
	def activate_perpetual(self, request, queryset):
		count = queryset.update(
			is_trial=False,
			plan="perpetual",
			plan_expires_at=None,
			is_service_active=True,
			daily_orders_count=0,
			daily_orders_date=None,
		)
		self.message_user(request, f"Activated perpetual plan for {count} vendors")

	@admin.action(description="Revoke Service (disable bot + app actions)")
	def revoke_service(self, request, queryset):
		count = queryset.update(is_service_active=False)
		self.message_user(request, f"Revoked service for {count} vendors")

	@admin.action(description="Reset Daily Order Count")
	def reset_daily_orders(self, request, queryset):
		count = queryset.update(daily_orders_count=0, daily_orders_date=None)
		self.message_user(request, f"Reset daily order count for {count} vendors")

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

	@admin.action(description="Apply custom plan / duration / daily limit to selected vendors")
	def apply_custom_plan_and_limits(self, request, queryset):
		# Read values from the action form POST data
		plan = request.POST.get('custom_plan')
		days = request.POST.get('duration_days')
		custom_limit = request.POST.get('custom_daily_limit')
		updated = 0
		from django.utils import timezone
		for v in queryset:
			changed = False
			# Apply selected plan and optional duration
			if plan:
				v.plan = plan
				v.is_trial = False
				if days and str(days).strip() != '':
					try:
						d = int(days)
						if d > 0:
							v.plan_expires_at = timezone.now() + timedelta(days=d)
						else:
							v.plan_expires_at = None
					except Exception:
						# ignore parse errors and leave expiration unchanged
						pass
				changed = True

			# Apply custom daily limit (best-effort). There's no dedicated field for "daily limit",
			# so this action will only adjust the counter if a non-negative limit is provided.
			if custom_limit and str(custom_limit).strip() != '':
				try:
					cl = int(custom_limit)
					if cl >= 0:
						# Reduce the current counter to the new limit if needed.
						v.daily_orders_count = min(v.daily_orders_count, cl)
					changed = True
				except Exception:
					# ignore parse errors
					pass

			if changed:
				v.save()
				updated += 1
		self.message_user(request, f"Applied custom plan/limits to {updated} vendors")

	# expose the custom apply action in the admin actions tuple
	actions = ("start_14_day_trial", "activate_free_plan", "activate_monthly", "activate_quarterly", "activate_semi_annual", "activate_yearly", "activate_perpetual", "revoke_service", "reset_daily_orders", "generate_external_ids", "apply_custom_plan_and_limits")



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
