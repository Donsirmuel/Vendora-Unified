import os
from typing import Optional

import requests
from decouple import config as dconfig
from django.conf import settings
from django.core.management.base import BaseCommand


def _mask(val: Optional[str]) -> str:
    if not val:
        return "(empty)"
    s = str(val)
    if len(s) <= 8:
        return "***"
    return f"{s[:4]}...{s[-4:]}"


class Command(BaseCommand):
    help = "Diagnose Telegram Bot config: source precedence, getMe, and webhook status (masked outputs)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete-webhook",
            action="store_true",
            help="Delete existing Telegram webhook before checks.",
        )
    # no proxy options; always direct

    def handle(self, *args, **opts):
        # Read from three places to spot precedence issues
        os_env = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        env_file = str(dconfig("TELEGRAM_BOT_TOKEN", default=""))
        settings_val = str(getattr(settings, "TELEGRAM_BOT_TOKEN", ""))

        bot_username = str(getattr(settings, "TELEGRAM_BOT_USERNAME", ""))
        webhook_url = str(getattr(settings, "TELEGRAM_WEBHOOK_URL", ""))
        webhook_secret = str(getattr(settings, "TELEGRAM_WEBHOOK_SECRET", ""))

        self.stdout.write("Telegram config (masked):")
        self.stdout.write(f"  OS ENV   TELEGRAM_BOT_TOKEN = {_mask(os_env)}")
        self.stdout.write(f"  .env     TELEGRAM_BOT_TOKEN = {_mask(env_file)}")
        self.stdout.write(f"  settings TELEGRAM_BOT_TOKEN = {_mask(settings_val)}")
        self.stdout.write(f"  settings TELEGRAM_BOT_USERNAME = {bot_username or '(empty)'}")
        self.stdout.write(f"  settings TELEGRAM_WEBHOOK_URL = {webhook_url or '(empty)'}")
        self.stdout.write(f"  settings TELEGRAM_WEBHOOK_SECRET = {_mask(webhook_secret)}")

        token = settings_val.strip()
        if not token:
            self.stderr.write(self.style.ERROR("No TELEGRAM_BOT_TOKEN in settings. Check .env and OS env overrides."))
            return

        base = f"https://api.telegram.org/bot{token}"

        if opts.get("delete_webhook"):
            try:
                r = requests.post(f"{base}/deleteWebhook", timeout=10)
                self.stdout.write(self.style.WARNING(f"deleteWebhook HTTP {r.status_code}"))
            except Exception as e:
                self.stderr.write(self.style.WARNING(f"deleteWebhook failed: {e}"))

        # getMe
        try:
            r = requests.get(f"{base}/getMe", timeout=10)
            data = r.json()
            if bool(data.get("ok")):
                username = data.get("result", {}).get("username")
                bot_id = data.get("result", {}).get("id")
                self.stdout.write(self.style.SUCCESS(f"getMe ok (HTTP {r.status_code}) -> @{username} id={bot_id}"))
            else:
                desc = data.get("description")
                self.stderr.write(self.style.ERROR(f"getMe failed (HTTP {r.status_code}) -> {desc}"))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"getMe exception: {e}"))

        # webhook info
        try:
            r = requests.get(f"{base}/getWebhookInfo", timeout=10)
            try:
                info = r.json()
            except Exception:
                info = {}
            self.stdout.write(f"getWebhookInfo HTTP {r.status_code}: {info if info else '(no json)'}")
        except Exception as e:
            self.stderr.write(self.style.WARNING(f"getWebhookInfo failed: {e}"))
