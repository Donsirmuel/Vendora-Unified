"""Backfill Transaction.created_at from Order.created_at when available.

If an order has a created_at timestamp, use it. Otherwise set created_at to now().
"""
from django.db import migrations


def backfill_created_at(apps, schema_editor):
    Transaction = apps.get_model('transactions', 'Transaction')
    Order = apps.get_model('orders', 'Order')
    from django.utils import timezone

    now = timezone.now()
    # Iterate in batches if dataset is large (simple loop acceptable for small datasets)
    for txn in Transaction.objects.all():
        if txn.created_at is not None:
            continue
        try:
            order = Order.objects.filter(id=getattr(txn.order_id, 'id', txn.order_id)).first() if hasattr(txn, 'order_id') else None
            if order and getattr(order, 'created_at', None):
                txn.created_at = order.created_at
            else:
                txn.created_at = now
            txn.save(update_fields=['created_at'])
        except Exception:
            # Last resort: set to now
            txn.created_at = now
            txn.save(update_fields=['created_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0008_alter_transaction_options_transaction_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_created_at, reverse_code=migrations.RunPython.noop),
    ]
