# Generated migration for adding currency field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_vendor_daily_order_limit'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='currency',
            field=models.CharField(
                choices=[
                    ('USD', 'US Dollar (USD)'),
                    ('EUR', 'Euro (EUR)'),
                    ('GBP', 'British Pound (GBP)'),
                    ('JPY', 'Japanese Yen (JPY)'),
                    ('AUD', 'Australian Dollar (AUD)'),
                    ('CAD', 'Canadian Dollar (CAD)'),
                    ('CHF', 'Swiss Franc (CHF)'),
                    ('CNY', 'Chinese Yuan (CNY)'),
                    ('INR', 'Indian Rupee (INR)'),
                    ('NGN', 'Nigerian Naira (NGN)'),
                    ('ZAR', 'South African Rand (ZAR)'),
                    ('KES', 'Kenyan Shilling (KES)'),
                ],
                default='USD',
                max_length=10
            ),
        ),
    ]
