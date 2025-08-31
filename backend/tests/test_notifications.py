from django.urls import reverse
from typing import Any, cast


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


