from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Vendor, BroadcastMessage


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that accepts email instead of username"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace the username field with email field
        self.fields.pop('username', None)
        self.fields['email'] = serializers.EmailField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')
        
        # Since our Vendor model has USERNAME_FIELD = 'email', 
        # we need to pass the email as 'username' to the parent class
        attrs['username'] = email
        
        # Call parent validation which will use our Vendor model's authentication
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
    class Meta:
        model = Vendor
        fields = [
            "id",
            "email",
            "name",
            "bank_details",
            "is_available",
            "is_staff",
            "is_superuser",
        ]
        read_only_fields = ["id", "is_staff", "is_superuser"]

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Name cannot be empty.")
        return value


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
