from django.core.management.base import BaseCommand
from django.test import Client
from accounts.models import Vendor
import json


class Command(BaseCommand):
    help = 'Test authentication functionality'

    def handle(self, *args, **options):
        self.stdout.write("🔍 TESTING AUTHENTICATION")
        self.stdout.write("=" * 40)
        
        # Check users
        total = Vendor.objects.count()
        self.stdout.write(f"Total users: {total}")
        
        # Create test user
        email = "test@example.com"
        password = "testpass123"
        
        user, created = Vendor.objects.get_or_create(
            email=email,
            defaults={'name': 'Test User'}
        )
        
        if created:
            self.stdout.write(f"✅ Created: {email}")
        else:
            self.stdout.write(f"✅ Exists: {email}")
            
        user.set_password(password)
        user.is_active = True
        user.save()
        
        # Test auth
        client = Client()
        response = client.post(
            '/api/v1/accounts/token/',
            data=json.dumps({'email': email, 'password': password}),
            content_type='application/json'
        )
        
        self.stdout.write(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            self.stdout.write("✅ AUTH SUCCESS!")
            data = response.json()
            self.stdout.write(f"Access token: {data.get('access', 'None')[:30]}...")
        else:
            self.stdout.write("❌ AUTH FAILED!")
            self.stdout.write(f"Error: {response.content.decode()}")
