from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Vendor, BroadcastMessage, BankDetail
from django.conf import settings
import re


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT serializer that works with email-based login.

    Our Vendor model uses USERNAME_FIELD = 'email'. SimpleJWT respects
    AUTH_USER_MODEL.USERNAME_FIELD when validating credentials, so we
    don't need to redefine fields. However, the frontend posts `{ email, password }`.
    We'll gently map `email` into `username` for compatibility while also
    supporting native `{ username: email, password }` payloads.
    """

    def validate(self, attrs):
        # If client sent `email`, mirror it into `username` without removing keys.
        email = attrs.get('email')
        if email and not attrs.get('username'):
            attrs['username'] = email
        return super().validate(attrs)


class VendorRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for vendor registration/signup using username for display and bot link.

    Backend will set:
    - vendor.name = username (for display in PWA)
    - vendor.external_vendor_id = username (for public bot link)
    """
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = Vendor
        fields = ['email', 'username', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        return attrs

    def validate_email(self, value):
        if Vendor.objects.filter(email=value).exists():
            raise serializers.ValidationError('A vendor with this email already exists.')
        return value

    def validate_username(self, value: str) -> str:
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Username is required.')
        if len(value) < 3 or len(value) > 64:
            raise serializers.ValidationError('Username must be 3-64 characters long.')
        # Allow letters, numbers, underscores, and hyphens
        if not re.fullmatch(r'[A-Za-z0-9_\-]+', value):
            raise serializers.ValidationError('Use letters, numbers, underscores or hyphens only.')
        if Vendor.objects.filter(external_vendor_id=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def create(self, validated_data):
        username = validated_data.pop('username')
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        vendor = Vendor(**validated_data)
        # Set display name and public code from username
        vendor.name = username
        vendor.external_vendor_id = username
        vendor.set_password(password)
        # Initialize trial automatically if not explicitly disabled
        from django.utils import timezone
        from django.conf import settings
        from datetime import timedelta
        if getattr(vendor, 'is_trial', True) and not vendor.trial_started_at and not vendor.trial_expires_at:
                now = timezone.now()
                days = int(getattr(settings, 'TRIAL_DAYS', 14) or 14)
                vendor.trial_started_at = now  # type: ignore[assignment]
                vendor.trial_expires_at = now + timedelta(days=days)  # type: ignore[assignment]
                vendor.plan = 'trial'
                vendor.is_service_active = True  # type: ignore[assignment]
        vendor.save()
        return vendor

class VendorSerializer(serializers.ModelSerializer):
    """Serializer for Vendor accounts with explicit, safe fields."""
    avatar = serializers.ImageField(required=False, allow_null=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    subscription_status = serializers.SerializerMethodField(read_only=True)
    bot_username = serializers.SerializerMethodField(read_only=True)
    bot_link = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Vendor
        fields = [
            "id",
            "email",
            "name",
            "auto_accept",
            "trial_started_at",
            "telegram_username",
            "bio",
            "wallet_address",
            "wallet_chain",
            "avatar",
            "avatar_url",
            "bank_details",
            "auto_expire_minutes",
            "is_available",
            "unavailable_message",
            "is_staff",
            "is_superuser",
            "subscription_status",
            "bot_username",
            "bot_link",
        ]
        read_only_fields = ["id", "is_staff", "is_superuser"]

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_auto_expire_minutes(self, value):
        if value is None:
            return value
        try:
            ivalue = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Must be an integer number of minutes or null.")
        if ivalue <= 0:
            raise serializers.ValidationError("Must be greater than 0 minutes.")
        if ivalue > 24 * 60:
            # Hard cap to 24h to avoid very long pending orders
            raise serializers.ValidationError("Cannot exceed 1440 minutes (24 hours).")
        return ivalue

    def get_avatar_url(self, obj):
        try:
            if obj.avatar and hasattr(obj.avatar, "url"):
                request = self.context.get("request")
                url = obj.avatar.url
                if request is not None:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_subscription_status(self, obj):
        try:
            from django.utils import timezone
            now = timezone.now()
            status = {
                "active": bool(getattr(obj, "is_service_active", True)),
                "plan": getattr(obj, "plan", "trial"),
                "is_trial": bool(getattr(obj, "is_trial", False)),
                "trial_expires_at": getattr(obj, "trial_expires_at", None),
                # expose trial_started_at so frontend can compute fallback expiries
                "trial_started_at": getattr(obj, "trial_started_at", None),
                "plan_expires_at": getattr(obj, "plan_expires_at", None),
                "expired": False,
            }
            if status["is_trial"] and status["trial_expires_at"] and status["trial_expires_at"] < now:
                status["expired"] = True
            if status["plan"] not in {"trial", "perpetual"} and status["plan_expires_at"] and status["plan_expires_at"] < now:
                status["expired"] = True
            return status
        except Exception:
            return {"active": True, "plan": "trial", "is_trial": True}

    def get_bot_username(self, obj) -> str | None:
        try:
            u = str(getattr(settings, 'TELEGRAM_BOT_USERNAME', '') or '').strip()
            return u or None
        except Exception:
            return None

    def get_bot_link(self, obj) -> str | None:
        try:
            bot_user = self.get_bot_username(obj)
            if not bot_user:
                return None
            code = obj.external_vendor_id or str(getattr(obj, 'id', ''))
            if not code:
                return None
            return f"https://t.me/{bot_user}?start=vendor_{code}"
        except Exception:
            return None

    def validate_telegram_username(self, value: str) -> str:
        if value is None:
            return value
        v = value.strip()
        if v.startswith("@"):
            v = v[1:]
        # Basic constraint: 5-32 chars typical for Telegram; allow letters, digits, underscores
        import re
        if v and not re.fullmatch(r"[A-Za-z0-9_]{5,32}", v):
            raise serializers.ValidationError("Enter a valid Telegram username (letters, numbers, underscores, 5-32 chars).")
        return v


class BankDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankDetail
        fields = [
            "id",
            "bank_name",
            "account_number",
            "account_name",
            "instructions",
            "is_default",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class BroadcastMessageSerializer(serializers.ModelSerializer):
    """Serializer for broadcast messages to Telegram bot."""
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    
    class Meta:
        model = BroadcastMessage
        fields = [
            "id",
            "vendor",
            "vendor_name",
            "message_type",
            "title",
            "content",
            "is_sent",
            "sent_at",
            "created_at",
        ]
        read_only_fields = ["id", "vendor", "vendor_name", "is_sent", "sent_at", "created_at"]

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_content(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Content cannot be empty.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not Vendor.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    
    def validate_new_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class PlanUpgradeSerializer(serializers.Serializer):
    """Serializer to handle plan upgrades from trial to a paid tier.

    Supports: monthly, yearly, perpetual. Optional explicit duration override.
    """
    plan = serializers.ChoiceField(choices=[('monthly','Monthly'),('yearly','Yearly'),('perpetual','Perpetual')])
    duration_days = serializers.IntegerField(required=False, min_value=1, max_value=400)

    def validate(self, attrs):
        plan = attrs['plan']
        if plan == 'perpetual' and attrs.get('duration_days') is not None:
            raise serializers.ValidationError({'duration_days': 'Do not specify duration for perpetual plan.'})
        return attrs

    def save(self, **kwargs):  # type: ignore[override]
        vendor: Vendor = self.context['request'].user  # type: ignore[assignment]
        if not isinstance(self.validated_data, dict) or 'plan' not in self.validated_data:
            raise serializers.ValidationError({'plan': 'Plan is required.'})
        plan = self.validated_data['plan']
        duration_days = self.validated_data.get('duration_days')
        # Prevent downgrading to trial via this path
        if plan == 'trial':
            raise serializers.ValidationError({'plan': 'Cannot downgrade to trial via upgrade endpoint.'})
        # Idempotent if already on plan (non-trial)
        if vendor.plan == plan and not vendor.is_trial:
            return vendor
        if plan != 'perpetual' and duration_days is None:
            from django.conf import settings
            if plan == 'monthly':
                duration_days = int(getattr(settings, 'PLAN_DAYS_MONTHLY', 30))
            elif plan == 'yearly':
                duration_days = int(getattr(settings, 'PLAN_DAYS_YEARLY', 365))
        vendor.set_plan(plan, duration_days=duration_days)
        return vendor
