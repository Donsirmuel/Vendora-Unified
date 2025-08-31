#!/usr/bin/env python
"""
Comprehensive Django Authentication Test Suite
Tests all authentication logic and reports failures clearly
"""
import os
import sys
import django
import json
from django.test import TestCase, Client
from django.urls import reverse

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from accounts.models import Vendor
from rest_framework.test import APIClient


class AuthenticationTestSuite:
    def __init__(self):
        self.client = APIClient()
        self.test_email = "test@example.com"
        self.test_password = "testpass123"
        self.test_name = "Test User"
        self.results = []
    
    def log_result(self, test_name, passed, details=""):
        status = "✅ PASS" if passed else "❌ FAIL"
        self.results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
    
    def test_user_creation(self):
        """Test if we can create users properly"""
        try:
            # Clear any existing test user
            Vendor.objects.filter(email=self.test_email).delete()
            
            # Create user
            user = Vendor.objects.create_user(
                email=self.test_email,
                password=self.test_password,
                name=self.test_name
            )
            
            # Check user was created
            if user and user.email == self.test_email:
                self.log_result("User Creation", True, f"User {user.email} created successfully")
                return user
            else:
                self.log_result("User Creation", False, "User object not created properly")
                return None
                
        except Exception as e:
            self.log_result("User Creation", False, f"Exception: {str(e)}")
            return None
    
    def test_password_validation(self, user):
        """Test password checking"""
        if not user:
            self.log_result("Password Validation", False, "No user to test")
            return False
            
        try:
            # Test correct password
            correct = user.check_password(self.test_password)
            if correct:
                self.log_result("Password Validation (Correct)", True, "Password check successful")
            else:
                self.log_result("Password Validation (Correct)", False, "Password check failed")
                return False
            
            # Test wrong password
            wrong = user.check_password("wrongpassword")
            if not wrong:
                self.log_result("Password Validation (Wrong)", True, "Wrong password correctly rejected")
                return True
            else:
                self.log_result("Password Validation (Wrong)", False, "Wrong password incorrectly accepted")
                return False
                
        except Exception as e:
            self.log_result("Password Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_signup_endpoint(self):
        """Test the signup API endpoint"""
        try:
            # Clear existing user
            Vendor.objects.filter(email="signup@test.com").delete()
            
            signup_data = {
                "email": "signup@test.com",
                "name": "Signup Test User",
                "password": "signuppass123",
                "password_confirm": "signuppass123"
            }
            
            response = self.client.post('/api/v1/accounts/signup/', signup_data, format='json')
            
            if response.status_code in [200, 201]:
                self.log_result("Signup Endpoint", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_result("Signup Endpoint", False, f"Status: {response.status_code}, Response: {response.content.decode()}")
                return False
                
        except Exception as e:
            self.log_result("Signup Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_login_endpoint_with_email(self, user):
        """Test login with email field"""
        if not user:
            self.log_result("Login with Email", False, "No user to test")
            return False
            
        try:
            login_data = {
                "email": self.test_email,
                "password": self.test_password
            }
            
            response = self.client.post('/api/v1/accounts/token/', login_data, format='json')
            
            if response.status_code == 200:
                data = response.json()
                if 'access' in data and 'refresh' in data:
                    self.log_result("Login with Email", True, "JWT tokens received successfully")
                    return True
                else:
                    self.log_result("Login with Email", False, f"Missing tokens in response: {data}")
                    return False
            else:
                self.log_result("Login with Email", False, f"Status: {response.status_code}, Response: {response.content.decode()}")
                return False
                
        except Exception as e:
            self.log_result("Login with Email", False, f"Exception: {str(e)}")
            return False
    
    def test_login_endpoint_with_username(self, user):
        """Test if login still works with username field (should work since we map it internally)"""
        if not user:
            self.log_result("Login with Username", False, "No user to test")
            return False
            
        try:
            login_data = {
                "username": self.test_email,  # Using email as username
                "password": self.test_password
            }
            
            response = self.client.post('/api/v1/accounts/token/', login_data, format='json')
            
            if response.status_code == 200:
                self.log_result("Login with Username", True, "Username fallback works")
                return True
            else:
                self.log_result("Login with Username", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Login with Username", False, f"Exception: {str(e)}")
            return False
    
    def test_token_refresh(self, user):
        """Test JWT token refresh functionality"""
        if not user:
            self.log_result("Token Refresh", False, "No user to test")
            return False
            
        try:
            # First get tokens
            login_data = {"email": self.test_email, "password": self.test_password}
            response = self.client.post('/api/v1/accounts/token/', login_data, format='json')
            
            if response.status_code != 200:
                self.log_result("Token Refresh", False, "Could not get initial tokens")
                return False
            
            tokens = response.json()
            refresh_token = tokens.get('refresh')
            
            if not refresh_token:
                self.log_result("Token Refresh", False, "No refresh token received")
                return False
            
            # Test refresh
            refresh_response = self.client.post('/api/v1/accounts/token/refresh/', 
                                              {"refresh": refresh_token}, format='json')
            
            if refresh_response.status_code == 200:
                refresh_data = refresh_response.json()
                if 'access' in refresh_data:
                    self.log_result("Token Refresh", True, "Token refresh successful")
                    return True
                else:
                    self.log_result("Token Refresh", False, "No access token in refresh response")
                    return False
            else:
                self.log_result("Token Refresh", False, f"Refresh failed: {refresh_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Token Refresh", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🔍 COMPREHENSIVE AUTHENTICATION TEST SUITE")
        print("=" * 60)
        
        # Test 1: User Creation
        user = self.test_user_creation()
        
        # Test 2: Password Validation
        self.test_password_validation(user)
        
        # Test 3: Signup Endpoint
        self.test_signup_endpoint()
        
        # Test 4: Login with Email
        self.test_login_endpoint_with_email(user)
        
        # Test 5: Login with Username (fallback)
        self.test_login_endpoint_with_username(user)
        
        # Test 6: Token Refresh
        self.test_token_refresh(user)
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY:")
        passed = sum(1 for r in self.results if r['passed'])
        total = len(self.results)
        
        print(f"Passed: {passed}/{total}")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Authentication is working perfectly.")
        else:
            print("⚠️  SOME TESTS FAILED. See details above.")
            print("\nFailed tests:")
            for result in self.results:
                if not result['passed']:
                    print(f"  - {result['test']}: {result['details']}")


def main():
    # Clear database first
    print("Clearing test data...")
    Vendor.objects.filter(email__icontains='test').delete()
    
    # Run tests
    suite = AuthenticationTestSuite()
    suite.run_all_tests()


if __name__ == "__main__":
    main()
