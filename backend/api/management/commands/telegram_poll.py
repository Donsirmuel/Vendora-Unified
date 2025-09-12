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
            default=15,
            help="Long-poll timeout seconds for getUpdates (default 15).",
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
            last_expire_check = 0.0
            while True:
                # Periodic auto-expire tick (every ~60s)
                try:
                    now_ts = time.time()
                    if now_ts - last_expire_check >= 60:
                        last_expire_check = now_ts
                        try:
                            from django.utils import timezone
                            from orders.models import Order
                            from api.telegram_service import TelegramBotService
                            now = timezone.now()
                            qs = Order.objects.filter(status=Order.PENDING, auto_expire_at__isnull=False, auto_expire_at__lt=now)
                            for o in qs.iterator():
                                o.status = Order.EXPIRED
                                o.save(update_fields=["status"])
                                # Ensure an 'expired' transaction exists for history/UI
                                try:
                                    from transactions.models import Transaction
                                    Transaction._default_manager.get_or_create(order=o, defaults={"status": "expired"})
                                except Exception:
                                    pass
                                try:
                                    if o.customer_chat_id:
                                        TelegramBotService().send_message(
                                            f"⏰ Order {o.order_code or o.pk} has expired.",
                                            chat_id=str(o.customer_chat_id),
                                        )
                                except Exception:
                                    pass
                        except Exception:
                            pass
                except Exception:
                    pass

                params = {"timeout": timeout}
                if offset:
                    params["offset"] = offset

                try:
                    # Keep connection timeout short to avoid long hangs
                    resp = requests.get(
                        f"{base_url}/getUpdates",
                        params=params,
                        timeout=(5, timeout + 2),  # (connect, read)
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                except Exception as e:
                    self.stderr.write(self.style.WARNING(f"getUpdates failed: {e}"))
                    time.sleep(2)
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
                        # Short connect timeout to local server, modest read timeout
                        requests.post(local_url, data=json.dumps(upd), headers=headers, timeout=(3, 8))
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
