from django.urls import reverse
from transactions.models import Transaction
from orders.models import Order
from typing import Any, cast


def test_transactions_list_requires_auth(db):
    from rest_framework.test import APIClient

    client = APIClient()
    url = reverse("transactions:transaction-list")
    res = client.get(url)
    assert int(getattr(res, "status_code", 0)) in (401, 403)


def test_transactions_scoped_to_vendor(auth_client, vendor_user):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    other = User.objects.create_user(email="other2@example.com", password="pass1234", name="Other2")

    my_order = cast(Any, Order).objects.create(vendor=vendor_user, asset="SOL", type=Order.BUY, amount=3, rate=30)
    other_order = cast(Any, Order).objects.create(vendor=other, asset="ADA", type=Order.SELL, amount=4, rate=2)
    cast(Any, Transaction).objects.create(order=my_order, proof="proofs/a.txt", status="completed")
    cast(Any, Transaction).objects.create(order=other_order, proof="proofs/b.txt", status="declined")

    url = reverse("transactions:transaction-list")
    res = auth_client.get(url)
    assert int(res.status_code) == 200
    assert len(res.json()["results"]) == 1


def test_transaction_complete_action(auth_client, vendor_user, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from django.urls import reverse

    my_order = cast(Any, Order).objects.create(vendor=vendor_user, asset="SOL", type=Order.BUY, amount=3, rate=30)
    txn = cast(Any, Transaction).objects.create(order=my_order, status="uncompleted")

    file_content = b"dummy"
    upload = SimpleUploadedFile("proof.txt", file_content, content_type="text/plain")

    url = reverse("transactions:transaction-complete", args=[txn.id])
    res = auth_client.post(url, {"status": "completed", "proof": upload}, format="multipart")
    assert int(res.status_code) == 200
    txn.refresh_from_db()
    assert txn.status == "completed"
    assert txn.proof.name


def test_declined_transaction_cannot_complete(auth_client, vendor_user, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from django.urls import reverse

    my_order = cast(Any, Order).objects.create(vendor=vendor_user, asset="SOL", type=Order.BUY, amount=3, rate=30)
    declined_txn = cast(Any, Transaction).objects.create(order=my_order, status="declined")
    upload = SimpleUploadedFile("proof.txt", b"dummy", content_type="text/plain")
    url = reverse("transactions:transaction-complete", args=[declined_txn.id])
    res = auth_client.post(url, {"status": "completed", "proof": upload}, format="multipart")
    assert int(res.status_code) == 400
    declined_txn.refresh_from_db()
    assert declined_txn.status == "declined"

