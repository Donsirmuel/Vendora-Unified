from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("queries", "0003_query_contact_query_vendor_alter_query_order"),
    ]

    operations = [
        migrations.AddField(
            model_name="query",
            name="status",
            field=models.CharField(
                max_length=16,
                choices=[("pending", "Pending"), ("replied", "Replied"), ("resolved", "Resolved")],
                default="pending",
            ),
        ),
        migrations.AddField(
            model_name="query",
            name="customer_chat_id",
            field=models.CharField(max_length=64, blank=True),
        ),
        migrations.AddField(
            model_name="query",
            name="notified_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]
