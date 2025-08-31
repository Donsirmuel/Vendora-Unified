#!/usr/bin/env python
"""
Simple authentication test that writes results to a file
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from django.test import Client
from accounts.models import Vendor
import json

def test_authentication():
    results = []
    
    try:
        # Test 1: Create user
        results.append("=== TESTING USER CREATION ===")
        email = "filetest@example.com"
        password = "testpass123"
        
        # Clear existing
        Vendor.objects.filter(email=email).delete()
        
        user = Vendor.objects.create_user(
            email=email,
            password=password,
            name="File Test User"
        )
        
        if user:
            results.append("✅ User creation: SUCCESS")
            results.append(f"   Email: {user.email}")
            results.append(f"   Name: {user.name}")
            results.append(f"   Active: {user.is_active}")
        else:
            results.append("❌ User creation: FAILED")
            return results
        
        # Test 2: Password check
        results.append("\n=== TESTING PASSWORD VALIDATION ===")
        if user.check_password(password):
            results.append("✅ Password validation: SUCCESS")
        else:
            results.append("❌ Password validation: FAILED")
        
        # Test 3: Authentication endpoint
        results.append("\n=== TESTING AUTHENTICATION ENDPOINT ===")
        client = Client()
        
        auth_data = {
            'email': email,
            'password': password
        }
        
        response = client.post(
            '/api/v1/accounts/token/',
            data=json.dumps(auth_data),
            content_type='application/json'
        )
        
        results.append(f"Response Status: {response.status_code}")
        results.append(f"Response Content: {response.content.decode()}")
        
        if response.status_code == 200:
            data = response.json()
            if 'access' in data and 'refresh' in data:
                results.append("✅ Authentication endpoint: SUCCESS")
                results.append(f"   Access token: {data['access'][:50]}...")
                results.append(f"   Refresh token: {data['refresh'][:50]}...")
            else:
                results.append("❌ Authentication endpoint: Missing tokens")
        else:
            results.append("❌ Authentication endpoint: FAILED")
        
        # Test 4: Signup endpoint
        results.append("\n=== TESTING SIGNUP ENDPOINT ===")
        signup_email = "signup_test@example.com"
        Vendor.objects.filter(email=signup_email).delete()
        
        signup_data = {
            'email': signup_email,
            'name': 'Signup Test User',
            'password': 'signuppass123',
            'password_confirm': 'signuppass123'
        }
        
        signup_response = client.post(
            '/api/v1/accounts/signup/',
            data=json.dumps(signup_data),
            content_type='application/json'
        )
        
        results.append(f"Signup Status: {signup_response.status_code}")
        results.append(f"Signup Content: {signup_response.content.decode()}")
        
        if signup_response.status_code in [200, 201]:
            results.append("✅ Signup endpoint: SUCCESS")
        else:
            results.append("❌ Signup endpoint: FAILED")
        
    except Exception as e:
        results.append(f"❌ EXCEPTION OCCURRED: {str(e)}")
        import traceback
        results.append(f"Traceback: {traceback.format_exc()}")
    
    return results

if __name__ == "__main__":
    results = test_authentication()
    
    # Write to file
    with open('auth_test_results.txt', 'w') as f:
        for line in results:
            f.write(line + '\n')
    
    print("Test completed! Check auth_test_results.txt for details.")
