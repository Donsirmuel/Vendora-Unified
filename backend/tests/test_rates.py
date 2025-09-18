from django.urls import reverse
from typing import Any, cast


def test_rates_requires_auth(db):
    from rest_framework.test import APIClient

    client = APIClient()
    url = reverse("rates:rate-list")
    res = client.get(url)
    # The response object from APIClient has a status_code attribute, not WSGIRequest.
    assert int(getattr(res, "status_code", 0)) in (401, 403)


def test_rate_create_and_duplicate_prevent(auth_client, vendor_user):
    from rates.models import Rate

    url = reverse("rates:rate-list")
    payload = {
        "vendor": vendor_user.id,
        "asset": "BTC",
        "buy_rate": "10000.00",
        "sell_rate": "9500.00",
        "contract_address": "0x123",
    }
    res = auth_client.post(url, payload, format="json")
    assert int(res.status_code) in (200, 201)

    # Duplicate
    res = auth_client.post(url, payload, format="json")
    assert int(res.status_code) in (400, 409)

