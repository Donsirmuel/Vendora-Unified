#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from accounts.models import Vendor

print("=== VENDORA DATABASE USER CHECK ===")
print(f"Total users in database: {Vendor.objects.count()}")
print("\nAll users:")
for user in Vendor.objects.all():
    print(f"  ID: {user.id}")
    print(f"  Email: {user.email}")
    print(f"  Name: {user.name}")
    print(f"  Active: {user.is_active}")
    print(f"  Staff: {user.is_staff}")
    print(f"  Superuser: {user.is_superuser}")
    print("  ---")

print("\nChecking for specific signup user...")
signup_user = Vendor.objects.filter(email__icontains='test').first()
if signup_user:
    print(f"Found test user: {signup_user.email}")
else:
    print("No test user found")
