#!/usr/bin/env python
import os
import sys
import django
import json

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from django.test import Client
from accounts.models import Vendor

def test_authentication():
    print("=== AUTHENTICATION TEST ===")
    
    # Create test client
    client = Client()
    
    # First check if user exists or create one
    email = "test@example.com"
    password = "testpass123"
    
    user, created = Vendor.objects.get_or_create(
        email=email,
        defaults={
            'name': 'Test User',
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ Created new user: {email}")
    else:
        print(f"✅ User exists: {email}")
    
    # Set password (ensure it's correct)
    user.set_password(password)
    user.save()
    print("✅ Password set")
    
    # Test authentication endpoint
    print("\nTesting authentication endpoint...")
    
    # Test with email field (our custom implementation)
    response = client.post('/api/v1/accounts/token/', {
        'email': email,
        'password': password
    }, content_type='application/json')
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.content.decode()}")
    
    if response.status_code == 200:
        print("✅ Authentication successful with email field!")
        data = json.loads(response.content)
        if 'access' in data:
            print(f"✅ Access token received: {data['access'][:50]}...")
        if 'refresh' in data:
            print(f"✅ Refresh token received: {data['refresh'][:50]}...")
    else:
        print("❌ Authentication failed with email field")
        
        # Try with username field (fallback)
        print("\nTrying with username field...")
        response2 = client.post('/api/v1/accounts/token/', {
            'username': email,
            'password': password
        }, content_type='application/json')
        
        print(f"Status Code: {response2.status_code}")
        print(f"Response: {response2.content.decode()}")
        
        if response2.status_code == 200:
            print("✅ Authentication successful with username field!")
        else:
            print("❌ Authentication failed with username field too")

if __name__ == "__main__":
    test_authentication()
