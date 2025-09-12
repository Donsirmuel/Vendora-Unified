import json
import os
import time
from typing import Optional

import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path


class Command(BaseCommand):
    help = "Poll Telegram updates (long-poll) and forward to local webhook handler. Works without public tunnel."

    def add_arguments(self, parser):
        parser.add_argument(
            "--keep-webhook",
            action="store_true",
            help="Do not delete the existing Telegram webhook before polling (not recommended).",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=0,
            help="Sleep seconds between polls when no updates (default 0).",
        )
        parser.add_argument(
            "--timeout",
            type=int,
            default=30,
            help="Long-poll timeout seconds for getUpdates (default 30).",
        )
        parser.add_argument(
            "--local-url",
            type=str,
            default="http://127.0.0.1:8000/api/v1/telegram/webhook/",
            help="Local webhook URL to forward updates to.",
        )

    def handle(self, *args, **options):
        token = str(getattr(settings, "TELEGRAM_BOT_TOKEN", "") or "").strip()
        if not token:
            self.stderr.write(self.style.ERROR("TELEGRAM_BOT_TOKEN not configured in environment."))
            return

        base_url = f"https://api.telegram.org/bot{token}"
        secret = str(getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "") or "").strip()

        # Ensure webhook disabled so getUpdates works consistently
        if not options.get("keep_webhook"):
            try:
                requests.post(f"{base_url}/deleteWebhook", timeout=10)
                self.stdout.write(self.style.WARNING("Deleted existing Telegram webhook (if any)."))
            except Exception as e:
                self.stderr.write(self.style.WARNING(f"Could not delete webhook: {e}"))

        # Offset persistence so we don't reprocess old updates
        base_dir = Path(settings.BASE_DIR)
        offset_file = base_dir / ".telegram_offset"
        offset: Optional[int] = None
        if offset_file.exists():
            try:
                offset = int(offset_file.read_text().strip() or "0")
            except Exception:
                offset = None

        local_url = options["local_url"]
        interval = int(options["interval"]) or 0
        timeout = int(options["timeout"]) or 30

        self.stdout.write(self.style.SUCCESS("Starting Telegram long-polling... (Ctrl+C to stop)"))
        self.stdout.write(f"Forwarding updates to: {local_url}")

        try:
            while True:
                params = {"timeout": timeout}
                if offset:
                    params["offset"] = offset

                try:
                    resp = requests.get(f"{base_url}/getUpdates", params=params, timeout=timeout + 5)
                    resp.raise_for_status()
                    payload = resp.json()
                except Exception as e:
                    self.stderr.write(self.style.WARNING(f"getUpdates failed: {e}"))
                    time.sleep(3)
                    continue

                if not payload.get("ok"):
                    self.stderr.write(self.style.WARNING(f"Telegram returned not ok: {payload}"))
                    time.sleep(3)
                    continue

                updates = payload.get("result", [])
                if not updates:
                    if interval:
                        time.sleep(interval)
                    continue

                for upd in updates:
                    try:
                        # Forward to local webhook handler for unified logic
                        headers = {"Content-Type": "application/json"}
                        if secret:
                            headers["X-Telegram-Bot-Api-Secret-Token"] = secret
                        requests.post(local_url, data=json.dumps(upd), headers=headers, timeout=15)
                    except Exception as e:
                        self.stderr.write(self.style.WARNING(f"Failed forwarding update: {e}"))

                    # Advance offset
                    try:
                        update_id = int(upd.get("update_id"))
                        offset = update_id + 1
                        offset_file.write_text(str(offset))
                    except Exception:
                        pass

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Stopped polling."))
