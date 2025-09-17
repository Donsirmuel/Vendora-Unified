from django.urls import reverse
from typing import Any, cast
from unittest.mock import patch


def test_queries_requires_auth(db):
    from rest_framework.test import APIClient

    client = APIClient()
    url = reverse("queries:query-list")
    res = client.get(url)
    assert int(getattr(res, "status_code", 0)) in (401, 403)


def test_mark_done_sets_resolved(auth_client, vendor_user):
    # Create a query belonging to vendor
    from queries.models import Query
    q = cast(Any, Query).objects.create(vendor=vendor_user, message="Help please", status="pending")
    url = reverse("queries:query-mark-done", args=[q.id])
    # Patch correct import path for Telegram service (lives in api.telegram_service)
    with patch("api.telegram_service.TelegramBotService.send_message") as mocked:
        res = auth_client.post(url)
    assert res.status_code == 200
    q.refresh_from_db()
    assert q.status == "resolved"
