import json
from typing import cast
from django.test import TestCase, override_settings
from django.urls import reverse
from accounts.models import Vendor
from api.models import BotUser
from unittest.mock import patch


@override_settings(TELEGRAM_WEBHOOK_SECRET="")
class WebhookVendorResolutionTests(TestCase):
    def setUp(self):
        # create a vendor with username that we'll use as external identifier
        # create_user is provided by our custom manager; silence static analyzer
        self.vendor = Vendor.objects.create_user(email="vendor@example.com", password="pass", name="Vendor One")  # type: ignore[attr-defined]
        # set the username field used for deep-linking
        self.vendor.telegram_username = "vendor_one"
        # also set external_vendor_id to the username for /start vendor_<username>
        self.vendor.external_vendor_id = "vendor_one"
        self.vendor.save()

    @patch("api.telegram_service.TelegramBotService.send_message")
    def test_start_deeplink_links_botuser_by_username(self, mock_send):
        # Simulate Telegram sending /start vendor_vendor_one
        payload = {
            "message": {
                "chat": {"id": 12345},
                "text": "/start vendor_vendor_one",
            }
        }
        mock_send.return_value = {"success": True}
        url = reverse("telegram:webhook")
        resp = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(resp.status_code, 200)
        bu = BotUser.objects.filter(chat_id=str(12345)).first()
        self.assertIsNotNone(bu)
        # help the type checker know bu is not None
        bu = cast(BotUser, bu)
        # BotUser.vendor should be linked to the vendor
        self.assertIsNotNone(bu.vendor)
        from accounts.models import Vendor as _Vendor
        vendor = cast(_Vendor, bu.vendor)
        self.assertEqual(getattr(vendor, "id", None), getattr(self.vendor, "id", None))

    @patch("api.telegram_service.TelegramBotService.send_message")
    def test_switch_vendor_then_provide_username_links_vendor(self, mock_send):
        # First, send /switch_vendor command
        payload = {"message": {"chat": {"id": 22222}, "text": "/switch_vendor"}}
        mock_send.return_value = {"success": True}
        url = reverse("telegram:webhook")
        resp = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(resp.status_code, 200)
        bu = BotUser.objects.filter(chat_id=str(22222)).first()
        self.assertIsNotNone(bu)
        bu = cast(BotUser, bu)
        self.assertEqual(bu.state, "awaiting_vendor")

        # Now provide the vendor username in next message
        payload2 = {"message": {"chat": {"id": 22222}, "text": "vendor_one"}}
        resp2 = self.client.post(url, data=json.dumps(payload2), content_type="application/json")
        self.assertEqual(resp2.status_code, 200)
        bu.refresh_from_db()
        bu = cast(BotUser, bu)
        self.assertIsNotNone(bu.vendor)
        from accounts.models import Vendor as _Vendor
        vendor = cast(_Vendor, bu.vendor)
        self.assertEqual(getattr(vendor, "id", None), getattr(self.vendor, "id", None))
