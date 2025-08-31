from django.urls import reverse
from typing import Any, cast
from django.db.models import QuerySet


def test_orders_list_scoped_to_vendor(auth_client, vendor_user):
    # Other vendor
    from accounts.models import Vendor

    other = Vendor.objects.create_user(email="other@example.com", password="pass1234", name="Other")

    # Create orders for both vendors
    from orders.models import Order

    cast_qs: QuerySet[Any] = cast(Any, Order).objects.all()
    cast(Any, Order).objects.create(vendor=vendor_user, asset="BTC", type=Order.BUY, amount=1, rate=10000)
    cast(Any, Order).objects.create(vendor=other, asset="ETH", type=Order.SELL, amount=2, rate=2000)

    url = reverse("orders:order-list")
    res = auth_client.get(url)
    assert int(res.status_code) == 200
    assert len(res.data["results"]) == 1
    assert res.data["results"][0]["asset"] == "BTC"


def test_orders_requires_auth(db):
    from rest_framework.test import APIClient

    client = APIClient()
    url = reverse("orders:order-list")
    res = client.get(url)
    assert int(getattr(res, "status_code", 0)) in (401, 403)


def test_order_accept_and_decline(auth_client, vendor_user):
    from orders.models import Order
    from django.urls import reverse

    # Test accepting an order
    order1 = cast(Any, Order).objects.create(vendor=vendor_user, asset="BTC", type=Order.BUY, amount=1, rate=10000)

    accept_url = reverse("orders:order-accept", args=[order1.id])
    res = auth_client.post(accept_url)
    assert int(res.status_code) == 200

    order1.refresh_from_db()
    assert order1.status == Order.ACCEPTED

    # Test declining a different order (with required rejection reason)
    order2 = cast(Any, Order).objects.create(vendor=vendor_user, asset="ETH", type=Order.SELL, amount=2, rate=2000)
    
    decline_url = reverse("orders:order-decline", args=[order2.id])
    decline_data = {"rejection_reason": "Insufficient liquidity"}
    res = auth_client.post(decline_url, decline_data, format='json')
    assert int(res.status_code) == 200
    order2.refresh_from_db()
    assert order2.status == Order.DECLINED


