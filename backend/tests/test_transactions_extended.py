from django.urls import reverse
from typing import Any, cast
from orders.models import Order
from transactions.models import Transaction


def test_transactions_status_filter(auth_client, vendor_user):
    o1 = cast(Any, Order).objects.create(vendor=vendor_user, asset="BTC", type=Order.BUY, amount=1, rate=10)
    o2 = cast(Any, Order).objects.create(vendor=vendor_user, asset="ETH", type=Order.SELL, amount=2, rate=20)
    cast(Any, Transaction).objects.create(order=o1, status="completed")
    cast(Any, Transaction).objects.create(order=o2, status="declined")
    base = reverse("transactions:transaction-list")
    res = auth_client.get(base + "?status=completed")
    assert res.status_code == 200
    data = res.json()  # PATCHED
    assert all(r["status"] == "completed" for r in data["results"])


def test_transaction_pdf_endpoint_not_available(auth_client, vendor_user):
    # PDF generation may be missing reportlab -> expect 501 or 200 if installed
    o = cast(Any, Order).objects.create(vendor=vendor_user, asset="SOL", type=Order.BUY, amount=1, rate=5)
    t = cast(Any, Transaction).objects.create(order=o, status="completed")
    url = reverse("transactions:transaction-download-pdf", args=[t.id])
    res = auth_client.get(url)
    assert res.status_code in (200, 501)


def test_unique_transaction_per_order_constraint(auth_client, vendor_user):
    from django.db import IntegrityError
    o = cast(Any, Order).objects.create(vendor=vendor_user, asset="ADA", type=Order.SELL, amount=3, rate=30)
    cast(Any, Transaction).objects.create(order=o, status="uncompleted")
    try:
        cast(Any, Transaction).objects.create(order=o, status="completed")
        assert False, "Expected IntegrityError for duplicate transaction per order"
    except IntegrityError:
        pass


def test_transaction_timestamps_on_complete(auth_client, vendor_user, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    o = cast(Any, Order).objects.create(vendor=vendor_user, asset="DOT", type=Order.BUY, amount=1, rate=15)
    txn = cast(Any, Transaction).objects.create(order=o, status="uncompleted")
    url = reverse("transactions:transaction-complete", args=[txn.id])
    upload = SimpleUploadedFile("proof.txt", b"dummy", content_type="text/plain")
    res = auth_client.post(url, {"status": "completed", "proof": upload}, format="multipart")
    assert res.status_code == 200
    txn.refresh_from_db()
    assert txn.completed_at is not None
    # vendor_completed_at set internally when vendor completes
    assert txn.vendor_completed_at is not None