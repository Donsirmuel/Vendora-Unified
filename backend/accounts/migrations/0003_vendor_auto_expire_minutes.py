from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_auto"),
    ]

    operations = [
        migrations.AddField(
            model_name="vendor",
            name="auto_expire_minutes",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
