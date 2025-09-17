from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_vendor_unavailable_message"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendor",
            name="telegram_username",
            field=models.CharField(max_length=64, null=True, blank=True),
        ),
    ]
