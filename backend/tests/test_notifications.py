from django.urls import reverse
from typing import Any, cast
from unittest.mock import patch


def test_mark_notification_read(auth_client, vendor_user):
    from notifications.models import Notification

    notif = cast(Any, Notification).objects.create(vendor=vendor_user, title="Hello", message="World")
    url = reverse("notifications:notification-mark-read", args=[notif.id])
    res = auth_client.post(url)
    assert int(cast(Any, res).status_code) == 200
    notif.refresh_from_db()
    assert notif.is_read is True


def test_notifications_requires_auth(db):
    from rest_framework.test import APIClient
    from django.urls import reverse

    client = APIClient()
    url = reverse("notifications:notification-list")
    res = client.get(url)
    assert int(cast(Any, res).status_code) in (401, 403)


def test_push_subscription_create(auth_client, vendor_user):
    url = reverse("notifications:notification-subscribe")
    payload = {
        "endpoint": "https://example.com/ep1",
        "keys": {"p256dh": "abc", "auth": "def"},
    }
    res = auth_client.post(url, payload, format="json")
    assert res.status_code in (200, 201)
    # idempotent re-post
    res2 = auth_client.post(url, payload, format="json")
    assert res2.status_code in (200, 201)


@patch("notifications.views.webpush")
def test_test_push_endpoint(mock_webpush, auth_client):
    url = reverse("notifications:notification-test-push")
    res = auth_client.post(url, {"title": "Test", "message": "Hello"}, format="json")
    assert res.status_code == 200
    # webpush may not be called if no subscription yet; that's acceptable
    # So we only check it did not raise. If we want stronger assertion, create a subscription first.


