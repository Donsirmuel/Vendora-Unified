#!/usr/bin/env python
import os
import sys
import django

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from accounts.models import Vendor

def check_and_create_user():
    email = "test@example.com"
    password = "testpass123"
    name = "Test User"
    
    print("=== USER DATABASE CHECK ===")
    
    # Check total users
    total_users = Vendor.objects.count()
    print(f"Total users in database: {total_users}")
    
    # List all users
    if total_users > 0:
        print("\nExisting users:")
        for user in Vendor.objects.all():
            print(f"  Email: {user.email}")
            print(f"  Name: {user.name}")
            print(f"  Active: {user.is_active}")
            print("  ---")
    
    # Check for test user
    test_user = Vendor.objects.filter(email=email).first()
    
    if test_user:
        print(f"\n✅ Test user exists: {test_user.email}")
        print(f"   Name: {test_user.name}")
        print(f"   Active: {test_user.is_active}")
        
        # Check password
        if test_user.check_password(password):
            print("✅ Password is correct")
        else:
            print("❌ Password is incorrect, updating...")
            test_user.set_password(password)
            test_user.save()
            print("✅ Password updated")
    else:
        print(f"\n❌ No test user found, creating one...")
        test_user = Vendor.objects.create_user(
            email=email,
            password=password,
            name=name
        )
        print(f"✅ Created test user: {test_user.email}")
    
    return test_user

if __name__ == "__main__":
    user = check_and_create_user()
    print(f"\nTest credentials:")
    print(f"Email: {user.email}")
    print(f"Password: testpass123")
