from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from typing import Any, cast
from .models import Vendor
from .serializers import VendorRegistrationSerializer, CustomTokenObtainPairSerializer
import logging

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view that uses email instead of username"""
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """Vendor registration endpoint"""
    serializer = VendorRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            # Create vendor account
            vendor = cast(Vendor, serializer.save())
            
            # Send welcome email
            try:
                send_welcome_email(vendor)
            except Exception as e:
                logger.warning(f"Failed to send welcome email to {cast(str, vendor.email)}: {e}")
            
            return Response({
                'message': 'Account created successfully!',
                'user': {
                    'id': cast(int, vendor.pk),
                    'email': cast(str, vendor.email),
                    'name': cast(str, vendor.name),
                    'trial_expires_at': getattr(vendor, 'trial_expires_at', None),
                    'is_trial': getattr(vendor, 'is_trial', True),
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating vendor account: {e}")
            return Response({
                'error': 'Failed to create account. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request password reset token"""
    email = request.data.get('email')
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        vendor = Vendor.objects.get(email=email, is_active=True)
        
        # Generate reset token
        token = default_token_generator.make_token(vendor)
        uid = urlsafe_base64_encode(force_bytes(vendor.pk))
        
        # Send reset email
        try:
            send_password_reset_email(vendor, uid, token)
            
            return Response({
                'message': 'Password reset email sent successfully!'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return Response({
                'error': 'Failed to send reset email. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
    except cast(Any, Vendor).DoesNotExist:
        # Return success even if user doesn't exist (security)
        return Response({
            'message': 'If an account with this email exists, you will receive a reset link.'
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    """Confirm password reset with token"""
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not all([uid, token, new_password]):
        return Response({
            'error': 'Missing required fields'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters long'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Decode user ID
        pk = force_str(urlsafe_base64_decode(uid))
        vendor = Vendor.objects.get(pk=pk, is_active=True)
        
        # Verify token
        if default_token_generator.check_token(vendor, token):
            # Update password
            vendor.set_password(new_password)
            vendor.save()
            
            return Response({
                'message': 'Password reset successfully!'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid or expired reset token'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except (cast(Any, Vendor).DoesNotExist, ValueError):
        return Response({
            'error': 'Invalid reset link'
        }, status=status.HTTP_400_BAD_REQUEST)


def send_welcome_email(vendor):
    """Send welcome email to new vendor"""
    subject = 'Welcome to Vendora - Your Crypto Trading Platform'
    
    # Create bot link for vendor (prefer external_vendor_id)
    code = getattr(vendor, 'external_vendor_id', None) or getattr(vendor, 'id', None)
    bot_link = f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}?start=vendor_{code}"
    
    message = f"""
Welcome to Vendora, {vendor.name}!

Your account has been created successfully. Here's what you can do now:

1. 🔑 Login to your PWA dashboard: {settings.FRONTEND_URL}
2. 📊 Set up your crypto rates and payment details
3. 🤖 Share your bot link with customers: {bot_link}
4. 💰 Start receiving and managing orders

Need help? Contact our support team.

Best regards,
Vendora Team
"""
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [vendor.email],
        fail_silently=False,
    )


def send_password_reset_email(vendor, uid, token):
    """Send password reset email"""
    subject = 'Reset Your Vendora Password'
    
    # Align with frontend route: /password-reset/confirm?uid=...&token=...
    reset_link = f"{settings.FRONTEND_URL}/password-reset/confirm?uid={uid}&token={token}"
    
    message = f"""
Hi {vendor.name},

You requested a password reset for your Vendora account.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you didn't request this reset, please ignore this email.

Best regards,
Vendora Team
"""
    
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [vendor.email],
        fail_silently=False,
    )
