#!/usr/bin/env python
"""
Test script to verify authentication functionality
"""
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from django.test import Client
from accounts.models import Vendor

def main():
    print("🔍 VENDORA AUTHENTICATION TEST")
    print("=" * 50)
    
    # Check database users first
    print("\n1. CHECKING DATABASE USERS:")
    total_users = Vendor.objects.count()
    print(f"   Total users: {total_users}")
    
    if total_users > 0:
        print("   Existing users:")
        for user in Vendor.objects.all():
            print(f"     - {user.email} ({user.name}) [Active: {user.is_active}]")
    
    # Create/ensure test user exists
    print("\n2. SETTING UP TEST USER:")
    test_email = "test@example.com"
    test_password = "testpass123"
    test_name = "Test User"
    
    try:
        user = Vendor.objects.get(email=test_email)
        print(f"   ✅ User exists: {test_email}")
    except Vendor.DoesNotExist:
        user = Vendor.objects.create_user(
            email=test_email,
            password=test_password,
            name=test_name
        )
        print(f"   ✅ Created user: {test_email}")
    
    # Ensure password is correct
    user.set_password(test_password)
    user.is_active = True
    user.save()
    print(f"   ✅ Password and activation confirmed")
    
    # Test authentication
    print("\n3. TESTING AUTHENTICATION:")
    client = Client()
    
    # Test data
    auth_data = {
        'email': test_email,
        'password': test_password
    }
    
    print(f"   Testing with: {auth_data}")
    
    try:
        response = client.post(
            '/api/v1/accounts/token/',
            data=json.dumps(auth_data),
            content_type='application/json'
        )
        
        print(f"   Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS! Tokens received:")
            print(f"     Access: {data.get('access', 'Missing')[:50]}...")
            print(f"     Refresh: {data.get('refresh', 'Missing')[:50]}...")
        else:
            print(f"   ❌ FAILED! Response: {response.content.decode()}")
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    main()
