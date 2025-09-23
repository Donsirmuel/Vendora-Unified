# Generated migration to add auto_accept to Vendor
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_paymentrequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendor',
            name='auto_accept',
            field=models.BooleanField(default=False),
        ),
    ]
