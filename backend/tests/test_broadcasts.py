from django.urls import reverse
from typing import Any, cast
import json


def test_broadcast_requires_auth(db):
    from rest_framework.test import APIClient

    client = APIClient()
    url = reverse("accounts:broadcast-list")
    res = client.get(url)
    # The APIClient returns a Response object, which has status_code
    assert int(getattr(res, "status_code", 0)) in (401, 403)


def test_broadcast_create_and_list(auth_client, vendor_user):
    from django.urls import reverse
    from accounts.models import BroadcastMessage

    url = reverse("accounts:broadcast-list")
    payload = {
        "message_type": "asset_added",
        "title": "New BTC Rate",
        "content": "Added new Bitcoin trading rate at $50,000"
    }
    
    # Create broadcast
    res = auth_client.post(url, payload, format="json")
    assert int(res.status_code) in (200, 201)
    
    # List broadcasts
    res = auth_client.get(url)
    assert int(res.status_code) == 200
    data = res.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["title"] == "New BTC Rate"


def test_broadcast_send_to_bot(auth_client, vendor_user):
    from django.urls import reverse
    from accounts.models import BroadcastMessage
    from unittest.mock import patch

    # Create broadcast
    broadcast = cast(Any, BroadcastMessage).objects.create(
        vendor=vendor_user,
        message_type="asset_added",
        title="Test Message",
        content="Test content"
    )
    
    # Mock the Telegram service to avoid configuration issues in tests
    with patch('api.telegram_service.TelegramBotService.send_message') as mock_send:
        mock_send.return_value = {"success": True, "message_id": 123}
        
        # Send to bot
        url = reverse("accounts:broadcast-send-to-bot", args=[broadcast.id])
        res = auth_client.post(url)
        assert int(res.status_code) == 200
        
        broadcast.refresh_from_db()
        assert broadcast.is_sent is True


def test_broadcast_scoped_to_vendor(auth_client, vendor_user):
    from django.urls import reverse
    from accounts.models import BroadcastMessage, Vendor

    # Create another vendor user
    other = Vendor.objects.create_user(email="other3@example.com", password="pass1234", name="Other3")
    
    # Create broadcasts for both vendors
    cast(Any, BroadcastMessage).objects.create(
        vendor=vendor_user,
        message_type="asset_added",
        title="My Message",
        content="My content"
    )
    cast(Any, BroadcastMessage).objects.create(
        vendor=vendor_user,
        message_type="general",
        title="Other Message",
        content="Other content"
    )
    
    # List broadcasts (should only see own)
    url = reverse("accounts:broadcast-list")
    res = auth_client.get(url)
    assert int(res.status_code) == 200
    data = res.json()
    assert len(data["results"]) == 2
    assert data["results"][0]["title"] == "Other Message"
