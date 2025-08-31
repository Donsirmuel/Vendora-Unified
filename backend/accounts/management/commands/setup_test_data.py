from django.core.management.base import BaseCommand
from accounts.models import Vendor  # Import our custom Vendor model directly
from rates.models import Rate


class Command(BaseCommand):
    help = 'Create test data for Vendora system'

    def handle(self, *args, **options):
        # Create test vendor user
        email = "test@vendor.com"
        password = "testpass123"
        name = "Test Vendor"
        
        # Check if user already exists
        if Vendor.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'User {email} already exists. Updating...')
            )
            vendor = Vendor.objects.get(email=email)
            vendor.set_password(password)
            vendor.name = name  # This works now because we're using Vendor model directly
            vendor.is_active = True
            vendor.save()
        else:
            # Use our custom Vendor model's create_user method
            vendor = Vendor.objects.create_user(
                email=email,
                password=password,
                name=name  # Our Vendor model accepts name parameter
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created vendor user: {email}')
            )
        
        # Create sample rates
        rates_data = [
            {
                'asset': 'BTC',
                'buy_rate': 65000.00,
                'sell_rate': 64000.00,
                'bank_details': 'GTBank\nAccount Name: Test Vendor\nAccount Number: 0123456789',
                'contract_address': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
            },
            {
                'asset': 'ETH',
                'buy_rate': 2800.00,
                'sell_rate': 2750.00,
                'bank_details': 'Access Bank\nAccount Name: Test Vendor\nAccount Number: 0987654321',
                'contract_address': '0x742d35Cc6634C0532925a3b8D42B4543c'
            },
            {
                'asset': 'USDT',
                'buy_rate': 1650.00,
                'sell_rate': 1630.00,
                'bank_details': 'UBA\nAccount Name: Test Vendor\nAccount Number: 2011223344',
                'contract_address': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            },
            {
                'asset': 'BNB',
                'buy_rate': 520.00,
                'sell_rate': 510.00,
                'bank_details': 'First Bank\nAccount Name: Test Vendor\nAccount Number: 3344556677',
                'contract_address': 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2'
            }
        ]
        
        for rate_data in rates_data:
            rate, created = Rate.objects.update_or_create(
                vendor=vendor,
                asset=rate_data['asset'],
                defaults={
                    'buy_rate': rate_data['buy_rate'],
                    'sell_rate': rate_data['sell_rate'],
                    'bank_details': rate_data['bank_details'],
                    'contract_address': rate_data['contract_address']
                }
            )
            action = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f'{action} rate for {rate.asset}: Buy ₦{rate.buy_rate}, Sell ₦{rate.sell_rate}')
            )
        
        self.stdout.write(
            self.style.SUCCESS('\n=== TEST DATA SETUP COMPLETE ===')
        )
        self.stdout.write(f'Vendor Login: {email}')
        self.stdout.write(f'Password: {password}')
        self.stdout.write(f'Assets configured: {len(rates_data)}')
        self.stdout.write('\nYou can now:')
        self.stdout.write('1. Login to the PWA with the credentials above')
        self.stdout.write('2. Start the Telegram bot')
        self.stdout.write('3. Test the complete order flow')