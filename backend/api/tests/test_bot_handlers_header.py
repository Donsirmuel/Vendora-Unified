from django.test import TestCase
from api import bot_handlers


class BotHandlersHeaderTests(TestCase):
    def test_handle_start_command_no_vendor(self):
        text, markup = bot_handlers.handle_start_command(None)
        # Header should mention Vendor and not include an '@'
        assert "Welcome to Vendora - You're currently trading with" in text
        # Buttons should include Switch Vendor
        ik = markup.get('inline_keyboard', []) if markup else []
        flat = [b['text'] for row in ik for b in row]
        assert "🔁 Switch Vendor" in flat

    def test_handle_start_command_with_vendor(self):
        # Create a Vendor object - use the accounts app
        from accounts.models import Vendor
        v = Vendor.objects.create(
            name="TestVendor",
            telegram_username="testvendor",
            external_vendor_id="testvendor",
        )
        text, markup = bot_handlers.handle_start_command(v.pk)
        assert "Welcome to Vendora - You're currently trading with testvendor" in text
        ik = markup.get('inline_keyboard', []) if markup else []
        flat = [b['text'] for row in ik for b in row]
        assert "🔁 Switch Vendor" in flat

    def test_back_to_menu_resolves_vendor_from_botuser(self):
        # Ensure that back_to_menu resolves vendor via BotUser
        from api.models import BotUser
        from accounts.models import Vendor
        v = Vendor.objects.create(
            name="BackTest",
            telegram_username="backtest",
            external_vendor_id="backtest",
        )
        bu = BotUser._default_manager.create(chat_id="9999", vendor=v)
        text, markup = bot_handlers.handle_callback_query('back_to_menu', vendor_id=None, chat_id="9999")
        assert "Welcome to Vendora - You're currently trading with backtest" in text
        ik = markup.get('inline_keyboard', []) if markup else []
        flat = [b['text'] for row in ik for b in row]
        assert "🔁 Switch Vendor" in flat
