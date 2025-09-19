import json
from typing import cast
from django.test import TestCase, override_settings
from django.urls import reverse
from accounts.models import Vendor
from api.models import BotUser
from unittest.mock import patch


@override_settings(TELEGRAM_WEBHOOK_SECRET="")
class WebhookCallbackSwitchVendorTests(TestCase):
    def setUp(self):
        # create a vendor that we'll link via callback flow
        self.vendor = Vendor.objects.create_user(email="vendorcb@example.com", password="pass", name="Vendor CB")  # type: ignore[attr-defined]
        self.vendor.telegram_username = "vendor_cb"
        self.vendor.external_vendor_id = "vendor_cb"
        self.vendor.save()

    @patch("api.telegram_service.TelegramBotService.send_message")
    def test_callback_switch_vendor_then_provide_username_links_vendor(self, mock_send):
        mock_send.return_value = {"success": True}
        url = reverse("telegram:webhook")
        # Simulate callback_query for switch_vendor
        callback_payload = {
            "callback_query": {
                "id": "1",
                "from": {"id": 999},
                "message": {"message_id": 10, "chat": {"id": 33333}},
                "data": "switch_vendor"
            }
        }
        resp = self.client.post(url, data=json.dumps(callback_payload), content_type="application/json")
        self.assertEqual(resp.status_code, 200)
        bu = BotUser.objects.filter(chat_id=str(33333)).first()
        self.assertIsNotNone(bu)
        bu = cast(BotUser, bu)
        self.assertEqual(bu.state, "awaiting_vendor")

        # Now provide vendor username in next message
        payload2 = {"message": {"chat": {"id": 33333}, "text": "vendor_cb"}}
        resp2 = self.client.post(url, data=json.dumps(payload2), content_type="application/json")
        self.assertEqual(resp2.status_code, 200)
        bu.refresh_from_db()
        self.assertIsNotNone(bu.vendor)
        vendor = cast(Vendor, bu.vendor)
        self.assertEqual(getattr(vendor, "id", None), getattr(self.vendor, "id", None))
