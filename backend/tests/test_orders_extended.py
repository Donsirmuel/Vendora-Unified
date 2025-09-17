from typing import Any, cast
from orders.models import Order
import re


def test_order_auto_expire_and_code(auth_client, vendor_user):
    from django.utils import timezone

    o = cast(Any, Order).objects.create(
        vendor=vendor_user,
        asset="BTC",
        type=Order.BUY,
        amount=1,
        rate=100,
    )
    assert o.auto_expire_at is not None, "auto_expire_at should be set for pending order"
    assert o.order_code, "order_code generated"
    # Pattern ORD-<01|02>-DDMMYYYY-vendorId-###
    today = timezone.localdate().strftime("%d%m%Y")
    pattern = rf"^ORD-(01|02)-{today}-{vendor_user.id}-\d{{3}}$"
    assert re.match(pattern, o.order_code), f"order_code pattern mismatch: {o.order_code}"


def test_order_code_uniqueness_sequence(auth_client, vendor_user):
    codes = []
    for _ in range(3):
        o = cast(Any, Order).objects.create(
            vendor=vendor_user,
            asset="ETH",
            type=Order.SELL,
            amount=2,
            rate=200,
        )
        codes.append(o.order_code)
    assert len(set(codes)) == 3, "Each order_code must be unique for vendor/day"
    # Ensure numeric sequence increments
    seqs = [int(c.split('-')[-1]) for c in codes]
    assert seqs == sorted(seqs), "Sequence numbers should increase"