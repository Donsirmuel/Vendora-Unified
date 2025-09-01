from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Vendor, BroadcastMessage, BankDetail


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
    """Serializer for vendor registration/signup"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = Vendor
        fields = ['email', 'name', 'password', 'password_confirm']
    
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
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        vendor = Vendor(**validated_data)
        vendor.set_password(password)
        vendor.save()
        return vendor


class VendorSerializer(serializers.ModelSerializer):
    """Serializer for Vendor accounts with explicit, safe fields."""
    avatar = serializers.ImageField(required=False, allow_null=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    class Meta:
        model = Vendor
        fields = [
            "id",
            "email",
            "name",
            "avatar",
            "avatar_url",
            "bank_details",
            "auto_expire_minutes",
            "is_available",
            "is_staff",
            "is_superuser",
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
