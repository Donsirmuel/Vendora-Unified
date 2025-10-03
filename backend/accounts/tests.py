from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

Vendor = get_user_model()


class AccountStatusMiddlewareTestCase(TestCase):
    """Test that AccountStatusMiddleware properly allows auth endpoints even for expired accounts"""

    def setUp(self):
        self.client = APIClient()
        self.factory = RequestFactory()
        
        # Create a vendor with expired trial
        self.expired_vendor = Vendor.objects.create_user(
            email='expired@test.com',
            password='TestPass123!',
            name='Expired Test'
        )
        self.expired_vendor.external_vendor_id = 'expired_test'
        self.expired_vendor.is_trial = True
        self.expired_vendor.trial_started_at = timezone.now() - timedelta(days=20)
        self.expired_vendor.trial_expires_at = timezone.now() - timedelta(days=5)
        self.expired_vendor.is_service_active = True
        self.expired_vendor.save()

    def test_signup_allowed_with_expired_token(self):
        """Test that signup endpoint works even when request includes expired account JWT token"""
        # Get JWT token for expired account
        refresh = RefreshToken.for_user(self.expired_vendor)
        token = str(refresh.access_token)
        
        # Try to signup with a new account while having the expired token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/v1/accounts/signup/', {
            'email': 'newuser@test.com',
            'username': 'newuser',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!'
        })
        
        # Should succeed (201) or return validation error (400), but NOT 403 Forbidden
        self.assertIn(response.status_code, [201, 400], 
                     f"Signup should not return 403 with expired token, got {response.status_code}")
        
    def test_signup_allowed_with_expired_token_no_trailing_slash(self):
        """Test signup works with path without trailing slash"""
        refresh = RefreshToken.for_user(self.expired_vendor)
        token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/v1/accounts/signup', {  # No trailing slash
            'email': 'newuser2@test.com',
            'username': 'newuser2',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!'
        })
        
        # Django will redirect to add trailing slash, then process
        # Either way, should not get 403
        self.assertNotEqual(response.status_code, 403,
                           "Signup should not return 403 even without trailing slash")

    def test_password_reset_allowed_with_expired_token(self):
        """Test that password reset endpoint works even with expired account JWT token"""
        refresh = RefreshToken.for_user(self.expired_vendor)
        token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/v1/accounts/password-reset/', {
            'email': 'expired@test.com'
        })
        
        # Should succeed (200) or return validation error, but NOT 403 Forbidden
        self.assertNotEqual(response.status_code, 403,
                           "Password reset should not return 403 with expired token")

    def test_token_refresh_allowed_with_expired_account(self):
        """Test that token refresh works for expired accounts (so they can still logout properly)"""
        refresh = RefreshToken.for_user(self.expired_vendor)
        
        response = self.client.post('/api/v1/accounts/token/refresh/', {
            'refresh': str(refresh)
        })
        
        # Should succeed (200) - users with expired accounts should still be able to refresh tokens
        # This allows them to properly logout or access upgrade pages
        self.assertNotEqual(response.status_code, 403,
                           "Token refresh should not return 403 for expired accounts")
