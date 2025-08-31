#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('C:/Users/user/Desktop/Vendora-Alpha/vendora')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vendora.settings')
django.setup()

from accounts.models import Vendor
from rates.models import Rate

# Create test vendor
email = 'test@vendor.com'
password = 'testpass123'

# Delete existing if any
Vendor.objects.filter(email=email).delete()

# Create new vendor
vendor = Vendor.objects.create(
    email=email,
    password=password,
    name='Test Vendor',
    is_active=True
)

print(f'✅ Created vendor: {email}')

# Create sample rates
Rate.objects.filter(vendor=vendor).delete()

rates_data = [
    {'asset': 'BTC', 'buy_rate': 65000, 'sell_rate': 64000, 'bank_details': 'GTBank\nAccount: 0123456789\nName: Test Vendor'},
    {'asset': 'ETH', 'buy_rate': 2800, 'sell_rate': 2750, 'bank_details': 'Access Bank\nAccount: 0987654321\nName: Test Vendor'},
    {'asset': 'USDT', 'buy_rate': 1650, 'sell_rate': 1630, 'bank_details': 'UBA\nAccount: 2011223344\nName: Test Vendor'}
]

for rate_data in rates_data:
    Rate.objects.create(vendor=vendor, **rate_data)
    print(f'✅ Created rate for {rate_data["asset"]}')

print('\n🎉 TEST DATA SETUP COMPLETE!')
print(f'Login Credentials: {email} / {password}')
print('\nYou can now:')
print('1. Test login at: http://127.0.0.1:8000/api/v1/accounts/token/')
print('2. Start the React frontend')
print('3. Login to the PWA')
