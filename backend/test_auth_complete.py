"""
Pytest-compatible authentication tests for Vendora
Run with: pytest test_auth_complete.py -v -s
"""
import pytest
from django.test import Client
from accounts.models import Vendor
from rest_framework.test import APIClient
import json


@pytest.mark.django_db
class TestAuthentication:
    
    def setup_method(self):
        """Setup for each test"""
        self.client = APIClient()
        self.test_email = "test@example.com"
        self.test_password = "testpass123"
        self.test_name = "Test User"
        
        # Clean up any existing test users
        Vendor.objects.filter(email=self.test_email).delete()
    
    def test_user_model_creation(self):
        """Test that we can create users with the Vendor model"""
        user = Vendor.objects.create_user(
            email=self.test_email,
            password=self.test_password,
            name=self.test_name
        )
        
        assert user.email == self.test_email
        assert user.name == self.test_name
        assert user.is_active is True
        assert user.check_password(self.test_password) is True
        print(f"✅ User created successfully: {user.email}")
    
    def test_signup_endpoint(self):
        """Test the signup API endpoint"""
        signup_data = {
            "email": "signup@test.com",
            "name": "Signup Test",
            "password": "signuppass123",
            "password_confirm": "signuppass123"
        }
        
        response = self.client.post('/api/v1/accounts/signup/', signup_data, format='json')
        
        print(f"Signup response status: {response.status_code}")
        print(f"Signup response content: {response.content.decode()}")
        
        assert response.status_code in [200, 201]
        
        # Check user was created in database
        user = Vendor.objects.get(email="signup@test.com")
        assert user.name == "Signup Test"
        print("✅ Signup endpoint working correctly")
    
    def test_login_with_email(self):
        """Test login using email field"""
        # Create user first
        user = Vendor.objects.create_user(
            email=self.test_email,
            password=self.test_password,
            name=self.test_name
        )
        
        login_data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        response = self.client.post('/api/v1/accounts/token/', login_data, format='json')
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response content: {response.content.decode()}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert 'access' in data
        assert 'refresh' in data
        
        print(f"✅ Login successful - Access token: {data['access'][:30]}...")
    
    def test_login_with_wrong_password(self):
        """Test login with wrong password fails properly"""
        # Create user first
        user = Vendor.objects.create_user(
            email=self.test_email,
            password=self.test_password,
            name=self.test_name
        )
        
        login_data = {
            "email": self.test_email,
            "password": "wrongpassword"
        }
        
        response = self.client.post('/api/v1/accounts/token/', login_data, format='json')
        
        print(f"Wrong password response status: {response.status_code}")
        print(f"Wrong password response: {response.content.decode()}")
        
        assert response.status_code == 401
        print("✅ Wrong password correctly rejected")
    
    def test_login_with_nonexistent_user(self):
        """Test login with non-existent user fails properly"""
        login_data = {
            "email": "nonexistent@test.com",
            "password": "somepassword"
        }
        
        response = self.client.post('/api/v1/accounts/token/', login_data, format='json')
        
        print(f"Non-existent user response status: {response.status_code}")
        print(f"Non-existent user response: {response.content.decode()}")
        
        assert response.status_code == 401
        print("✅ Non-existent user correctly rejected")
    
    def test_token_refresh(self):
        """Test JWT token refresh functionality"""
        # Create user and get initial tokens
        user = Vendor.objects.create_user(
            email=self.test_email,
            password=self.test_password,
            name=self.test_name
        )
        
        login_response = self.client.post('/api/v1/accounts/token/', {
            "email": self.test_email,
            "password": self.test_password
        }, format='json')
        
        assert login_response.status_code == 200
        tokens = login_response.json()
        
        # Test refresh
        refresh_response = self.client.post('/api/v1/accounts/token/refresh/', {
            "refresh": tokens['refresh']
        }, format='json')
        
        print(f"Token refresh status: {refresh_response.status_code}")
        print(f"Token refresh response: {refresh_response.content.decode()}")
        
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        assert 'access' in refresh_data
        
        print("✅ Token refresh working correctly")
    
    def test_signup_password_mismatch(self):
        """Test signup fails when passwords don't match"""
        signup_data = {
            "email": "mismatch@test.com",
            "name": "Mismatch Test",
            "password": "password123",
            "password_confirm": "differentpassword"
        }
        
        response = self.client.post('/api/v1/accounts/signup/', signup_data, format='json')
        
        print(f"Password mismatch response status: {response.status_code}")
        print(f"Password mismatch response: {response.content.decode()}")
        
        assert response.status_code == 400
        print("✅ Password mismatch correctly rejected")
    
    def test_signup_duplicate_email(self):
        """Test signup fails with duplicate email"""
        # Create user first
        Vendor.objects.create_user(
            email=self.test_email,
            password=self.test_password,
            name=self.test_name
        )
        
        # Try to create another user with same email
        signup_data = {
            "email": self.test_email,
            "name": "Duplicate Test",
            "password": "newpassword123",
            "password_confirm": "newpassword123"
        }
        
        response = self.client.post('/api/v1/accounts/signup/', signup_data, format='json')
        
        print(f"Duplicate email response status: {response.status_code}")
        print(f"Duplicate email response: {response.content.decode()}")
        
        assert response.status_code == 400
        print("✅ Duplicate email correctly rejected")
