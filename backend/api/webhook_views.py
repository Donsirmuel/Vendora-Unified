from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def telegram_webhook(request):
    """Handle incoming webhooks from Telegram Bot."""
    try:
        # Optional: verify Telegram secret token header
        try:
            expected = str(getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "") or "").strip()
            if expected:
                got = str(request.headers.get("X-Telegram-Bot-Api-Secret-Token") or "").strip()
                if got != expected:
                    return JsonResponse({"status": "forbidden"}, status=403)
        except Exception:
            pass

        # Parse the incoming update
        update_data = json.loads(request.body or b"{}")
        # Avoid logging full payloads for performance and noise
        try:
            _k = 'message' if 'message' in update_data else ('callback_query' if 'callback_query' in update_data else 'update')
            logger.debug("TG webhook %s", _k)
        except Exception:
            pass

        response_text = None
        reply_markup = None

        # Extract message information
        if "message" in update_data:
            from . import bot_handlers
            message = update_data["message"]
            chat_id = message.get("chat", {}).get("id")
            text = (message.get("text", "") or "").strip()

            logger.debug("TG msg chat=%s txt_prefix=%s", chat_id, (text or '')[:24])

            # Handle different types of messages
            if text.startswith("/start"):
                # Parse vendor ID from start command: /start vendor_123
                vendor_id = None
                vendor_obj = None
                if " " in text:
                    parts = text.split(" ")
                    if len(parts) > 1 and parts[1].startswith("vendor_"):
                        # Remove only the leading 'vendor_' prefix once
                        token = parts[1][len("vendor_"):].strip() if parts[1].startswith("vendor_") else parts[1].strip()
                        # Try several ways to resolve the vendor token in order of reliability:
                        # - numeric ID
                        # - external_vendor_id exact match
                        # - telegram_username (strip @)
                        # - case-insensitive name match (last resort)
                        try:
                            if token.isdigit():
                                vendor_id = int(token)
                            else:
                                from accounts.models import Vendor as _Vendor
                                vendor_obj = None
                                # try external_vendor_id
                                try:
                                    vendor_obj = _Vendor.objects.filter(external_vendor_id__iexact=token).first()
                                except Exception:
                                    vendor_obj = None
                                # try telegram_username
                                if not vendor_obj:
                                    try:
                                        t = token.lstrip("@")
                                        vendor_obj = _Vendor.objects.filter(telegram_username__iexact=t).first()
                                    except Exception:
                                        vendor_obj = None
                                # try name search (case-insensitive) as a last resort
                                if not vendor_obj:
                                    try:
                                        vendor_obj = _Vendor.objects.filter(name__iexact=token).first()
                                    except Exception:
                                        vendor_obj = None

                                if vendor_obj:
                                    try:
                                        vendor_id = int(getattr(vendor_obj, "id", None) or 0)
                                    except Exception:
                                        vendor_id = None
                                else:
                                    vendor_id = None
                        except Exception:
                            vendor_id = None

                # Subscribe or update the BotUser
                try:
                    from .models import BotUser
                    from accounts.models import Vendor
                    from typing import Any, cast

                    bot_user, created = cast(Any, BotUser).objects.update_or_create(
                        chat_id=str(chat_id),
                        defaults={"is_subscribed": True},
                    )
                    logger.debug(f"/start token resolved: token={locals().get('token', None)} vendor_id={vendor_id} vendor_obj={getattr(vendor_obj, 'id', None) if vendor_obj else None}")
                    # If the start command didn't include a vendor token and this chat isn't linked,
                    # prompt the user to send the vendor identifier instead of showing the main menu.
                    prompted_for_vendor = False

                    # Link to vendor if provided (either vendor_id or resolved vendor_obj)
                    if vendor_id or vendor_obj:
                        try:
                            vendor = vendor_obj or cast(Any, Vendor).objects.get(id=vendor_id)
                            # Check manual gating flags
                            from django.utils import timezone
                            now = timezone.now()
                            allowed = True
                            if not getattr(vendor, "is_service_active", True):
                                allowed = False
                            else:
                                texp = getattr(vendor, "trial_expires_at", None)
                                if getattr(vendor, "is_trial", False) and texp and texp < now:
                                    allowed = False
                                elif getattr(vendor, "plan", "trial") not in {"trial", "perpetual"}:
                                    pea = getattr(vendor, "plan_expires_at", None)
                                    if pea and pea < now:
                                        allowed = False
                            if allowed:
                                bot_user.vendor = vendor
                                bot_user.save(update_fields=["vendor"])
                                logger.info(f"Linked BotUser {bot_user.chat_id} to Vendor {getattr(vendor,'id',None)} via /start")
                        except Exception as vendor_exc:
                            logger.warning(f"Failed to link BotUser to Vendor: {vendor_exc}")

                    # If no vendor was provided via the /start token and the BotUser has no linked vendor,
                    # prompt them to provide a vendor username/ID/code before showing the menu.
                    try:
                        if not vendor_id and not getattr(bot_user, "vendor", None):
                            bot_user.state = "awaiting_vendor"
                            bot_user.save(update_fields=["state"])
                            response_text = "Please send the vendor's username, ID, or code to link this chat to that vendor."
                            reply_markup = None
                            prompted_for_vendor = True
                    except Exception:
                        prompted_for_vendor = False

                except Exception as e:
                    logger.error(f"Failed to update or create BotUser: {e}")

                # Call the proper start command handler unless we already prompted for vendor
                # Prefer vendor_id from BotUser link
                try:
                    from .models import BotUser as _BotUser
                    bu = _BotUser._default_manager.filter(chat_id=str(chat_id)).first()
                    if bu and not vendor_id and getattr(bu, "vendor", None):
                        vendor_id = getattr(bu.vendor, "id", None)
                except Exception:
                    pass
                if not locals().get('prompted_for_vendor', False):
                    response_text, reply_markup = bot_handlers.handle_start_command(vendor_id)

            elif text.startswith("/help"):
                # Use vendor context if any
                try:
                    from .models import BotUser as _BotUser
                    bu = _BotUser._default_manager.filter(chat_id=str(chat_id)).first()
                    vid = getattr(getattr(bu, "vendor", None), "id", None) if bu else None
                except Exception:
                    vid = None
                response_text, reply_markup = bot_handlers.handle_help_command(vid)

            elif text.startswith("/switch_vendor"):
                # Ask user to send vendor username, ID, or code to link this chat
                try:
                    from .models import BotUser as _BotUser
                    _BotUser._default_manager.update_or_create(
                        chat_id=str(chat_id), defaults={"is_subscribed": True, "state": "awaiting_vendor"}
                    )
                except Exception:
                    pass
                response_text = "Please send the vendor's username, ID, or code to link this chat to that vendor."
                reply_markup = None

            elif text.startswith("/status"):
                response_text = "Bot is running and connected to Vendora PWA!"
                reply_markup = {}

            else:
                # Handle image/document uploads as proof first
                if message.get("photo") or message.get("document"):
                    try:
                        from .telegram_service import TelegramBotService
                        from .models import BotUser
                        from transactions.models import Transaction
                        from orders.models import Order
                        from django.core.files.base import ContentFile
                        from typing import Any, cast

                        # Determine file_id: choose highest resolution photo if multiple
                        file_id = None
                        if message.get("photo"):
                            photos = message["photo"]
                            # photos is a list of sizes; pick the last (largest)
                            if isinstance(photos, list) and photos:
                                file_id = photos[-1].get("file_id")
                        if not file_id and message.get("document"):
                            file_id = message["document"].get("file_id")

                        if not file_id:
                            response_text = "Couldn't read the uploaded file. Please try again."
                            reply_markup = None
                        else:
                            # Resolve current BotUser state
                            bu = cast(Any, BotUser)._default_manager.filter(chat_id=str(chat_id)).first()

                            if not bu or bu.state != "awaiting_proof" or not bu.temp_order_id:
                                response_text = "Thanks for the file. If this is a payment proof, please create an order first."
                                reply_markup = None
                            else:
                                # Download the file
                                tgs = TelegramBotService()
                                dres = tgs.download_file_by_file_id(file_id)
                                if not dres.get("success"):
                                    response_text = f"Couldn't download the file: {dres.get('error')}"
                                    reply_markup = None
                                else:
                                    filename = str(dres.get("filename") or "proof.jpg")
                                    content = dres.get("content")
                                    if not isinstance(content, (bytes, bytearray)) or not content:
                                        response_text = "Couldn't download the file content. Please try again."
                                        reply_markup = None
                                    else:
                                        # Find existing transaction (if any) for this order
                                        order_id = int(bu.temp_order_id)
                                        order = cast(Any, Order)._default_manager.get(id=order_id)
                                        # Only allow transaction/proof after vendor acceptance
                                        if order.status not in {Order.ACCEPTED, Order.COMPLETED}:
                                            response_text = "The vendor hasn't accepted your order yet. Please wait for acceptance and tap Continue before uploading your proof."
                                            reply_markup = None
                                        else:
                                            txn = cast(Any, Transaction)._default_manager.filter(order=order).first()
                                            if not txn:
                                                # Create a new transaction with status "uncompleted"
                                                txn = Transaction(order=order)
                                                txn.save()  # Save first to get a primary key if needed for FileField
                                            # Save the proof file
                                            if hasattr(txn, "proof") and hasattr(txn.proof, "save"):
                                                txn.proof.save(filename, ContentFile(bytes(content)), save=True)
                                            # Set status to "uncompleted" if possible; use getattr to avoid static analyzer warnings
                                            uncompleted_attr = getattr(Transaction, "UNCOMPLETED", None)
                                            if uncompleted_attr is not None:
                                                txn.status = uncompleted_attr
                                            else:
                                                txn.status = "uncompleted"
                                            txn.save(update_fields=["proof", "status"])
                                            bu.state = "awaiting_receiving"
                                            bu.temp_order_id = str(order.id)
                                            bu.save(update_fields=["state", "temp_order_id"])

                                    if order.status in {Order.ACCEPTED, Order.COMPLETED}:
                                        code_or_id = order.order_code or str(order.id)
                                        response_text = (
                                            f"✅ Proof received for Order ID: {code_or_id}.\n"
                                            f"Now, please enter your receiving details (bank account or wallet address)."
                                        )
                                        reply_markup = None
                    except Exception as e:
                        logger.error(f"Error handling file upload: {e}")
                        response_text = "An error occurred while processing your file. Please try again."
                        reply_markup = None

                elif text and not text.startswith("/"):
                    # Possibly freeform amount/receiving/note entry
                    try:
                        from .models import BotUser
                        from typing import Any, cast
                        bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                        # If we're awaiting a vendor identifier from the user (after /switch_vendor),
                        # attempt to resolve the provided text into a Vendor and link it.
                        if bu and getattr(bu, "state", "") == "awaiting_vendor":
                            try:
                                token = text.strip()
                                from accounts.models import Vendor as _Vendor
                                found = None
                                # numeric id
                                if token.isdigit():
                                    try:
                                        found = _Vendor.objects.filter(id=int(token)).first()
                                    except Exception:
                                        found = None
                                # external_vendor_id
                                if not found:
                                    try:
                                        found = _Vendor.objects.filter(external_vendor_id__iexact=token).first()
                                    except Exception:
                                        found = None
                                # telegram_username
                                if not found:
                                    try:
                                        found = _Vendor.objects.filter(telegram_username__iexact=token.lstrip("@")).first()
                                    except Exception:
                                        found = None
                                # name
                                if not found:
                                    try:
                                        found = _Vendor.objects.filter(name__iexact=token).first()
                                    except Exception:
                                        found = None

                                if found:
                                    bu.vendor = found
                                    bu.state = ""
                                    bu.save(update_fields=["vendor", "state"])
                                    response_text = "Linked to vendor successfully. Use /help to see available commands."
                                    reply_markup = None
                                else:
                                    response_text = "Couldn't find that vendor. Please check the username/ID and try again."
                                    reply_markup = None
                                # In either case we've handled this message
                                # send reply and return to avoid duplicate handling below
                                from .telegram_service import TelegramBotService
                                telegram_service = TelegramBotService()
                                telegram_service.chat_id = str(chat_id)
                                result = telegram_service.send_message(
                                    response_text or "",
                                    chat_id=str(chat_id),
                                    reply_markup=reply_markup,
                                )
                                if not result.get("success"):
                                    logger.error(f"Failed to send response to Telegram: {result.get('error')}")
                                return JsonResponse({"status": "ok"})
                            except Exception:
                                pass
                        if bu.state == "awaiting_amount" and bu.temp_asset and bu.temp_type:
                            amt = text.replace(",", "")
                            # Only proceed if vendor is active/subscribed
                            vendor_id = bu.vendor_id if bu.vendor else None
                            allowed = True
                            try:
                                if bu.vendor:
                                    from django.utils import timezone
                                    now = timezone.now()
                                    v = bu.vendor
                                    if not getattr(v, "is_service_active", True):
                                        allowed = False
                                    else:
                                        texp = getattr(v, "trial_expires_at", None)
                                        if getattr(v, "is_trial", False) and texp and texp < now:
                                            allowed = False
                                        elif getattr(v, "plan", "trial") not in {"trial", "perpetual"}:
                                            pea = getattr(v, "plan_expires_at", None)
                                            if pea and pea < now:
                                                allowed = False
                            except Exception:
                                pass
                            if not allowed:
                                response_text, reply_markup = ("Vendor subscription inactive. Please contact the vendor.", None)
                            else:
                                response_text, reply_markup = bot_handlers.handle_amount_confirmation(bu.temp_asset, bu.temp_type, amt, vendor_id, str(chat_id))
                            # Clear awaiting_amount to avoid reusing on next message
                            bu.state = ""
                            bu.save(update_fields=["state"])
                        elif bu.state == "awaiting_receiving" and bu.temp_order_id:
                            # Save receiving details then prompt for optional note
                            from transactions.models import Transaction
                            from typing import Any as _Any, cast as _cast
                            txn = _cast(_Any, Transaction)._default_manager.filter(order_id=int(bu.temp_order_id)).first()
                            if txn:
                                txn.customer_receiving_details = text.strip()
                                txn.save(update_fields=["customer_receiving_details"])
                                # If this transaction was created by auto_accept flow, notify vendor now
                                try:
                                    vendor = getattr(txn.order, 'vendor', None)
                                    if vendor and getattr(vendor, 'auto_accept', False) and txn.status == 'uncompleted':
                                        from notifications.views import send_web_push_to_vendor
                                        try:
                                            if not getattr(txn, 'vendor_notified', False):
                                                send_web_push_to_vendor(vendor, "Uncompleted transaction", f"Order {txn.order.order_code or txn.order.pk} has an uncompleted transaction", url="/transactions")
                                                txn.vendor_notified = True
                                                txn.save(update_fields=['vendor_notified'])
                                        except Exception:
                                            pass
                                except Exception:
                                    pass
                            bu.state = "awaiting_note"
                            bu.save(update_fields=["state"])
                            response_text = "Got it. If you have any other information to share with the vendor (optional), type it now. If not, send 'skip'."
                            reply_markup = None
                        elif bu.state == "awaiting_note" and bu.temp_order_id:
                            # Save optional note or skip
                            from transactions.models import Transaction
                            note = text.strip()
                            if note.lower() != "skip":
                                txn = Transaction._default_manager.filter(order_id=int(bu.temp_order_id)).first()
                                if txn:
                                    txn.customer_note = note
                                    txn.save(update_fields=["customer_note"])
                            bu.state = ""
                            bu.temp_order_id = ""
                            bu.save(update_fields=["state", "temp_order_id"])
                            response_text = "✅ Thanks! Your transaction details have been sent to the vendor. You'll be notified when it's processed."
                            reply_markup = None
                        elif bu.state == "awaiting_order_status":
                            # Parse code or numeric ID, find order in this vendor scope, and respond
                            from orders.models import Order
                            code = text.strip()
                            order = None
                            if code.upper().startswith("ORD-"):
                                order = Order._default_manager.select_related('vendor').filter(order_code__iexact=code).first()
                            else:
                                try:
                                    oid = int(code)
                                    order = Order._default_manager.select_related('vendor').filter(id=oid).first()
                                except Exception:
                                    order = None
                                # Enforce vendor scoping if this chat is linked to a vendor
                                v = getattr(bu, "vendor", None)
                            if order and v and getattr(order, "vendor_id", None) != getattr(v, "id", None):
                                order = None
                            if not order:
                                response_text = "Order not found. Please check the ID/Code and try again."
                                reply_markup = None
                            else:
                                # Format status like TransactionDetails: type/asset/amount/NGN total and key timestamps
                                from decimal import Decimal
                                amt = order.amount
                                total = order.total_value or (Decimal(order.amount) * Decimal(order.rate))
                                status = order.status.capitalize()
                                oid = getattr(order, "pk", None)
                                parts = [
                                    f"Order: {order.order_code or oid}",
                                    f"Type: {order.type.upper()} {order.asset}",
                                    f"Amount: {amt:,.2f} {order.asset}",
                                    f"Total: ₦{total:,.2f}",
                                    f"Status: {status}",
                                ]
                                if order.accepted_at:
                                    parts.append(f"Accepted: {order.accepted_at:%Y-%m-%d %H:%M}")
                                if order.declined_at:
                                    parts.append(f"Declined: {order.declined_at:%Y-%m-%d %H:%M}")
                                # Check transaction completion
                                from transactions.models import Transaction
                                txn = Transaction._default_manager.select_related('order').filter(order=order).first()
                                if txn:
                                    # If transaction has vendor/customer completion timestamps, show completed time
                                    if txn.vendor_completed_at or txn.completed_at:
                                        when = txn.vendor_completed_at or txn.completed_at
                                        parts.append(f"Completed: {when:%Y-%m-%d %H:%M}")
                                    else:
                                        # Show proof upload or creation time for uncompleted transactions
                                        if getattr(txn, 'proof_uploaded_at', None):
                                            parts.append(f"Proof uploaded: {txn.proof_uploaded_at:%Y-%m-%d %H:%M}")
                                        elif getattr(txn, 'created_at', None):
                                            parts.append(f"Transaction created: {txn.created_at:%Y-%m-%d %H:%M}")
                                response_text = "\n".join(parts)
                                reply_markup = None
                            # Reset state after responding
                            bu.state = ""
                            bu.save(update_fields=["state"])
                        elif bu.state == "awaiting_general_question":
                            # Create a Query object with vendor link and message; then ask for contact
                            from queries.models import Query
                            v = bu.vendor
                            q = Query._default_manager.create(vendor=v, message=text.strip(), status="pending")
                            bu.state = "awaiting_contact"
                            bu.temp_query_id = str(getattr(q, "pk", None) or "")
                            bu.save(update_fields=["state", "temp_query_id"])
                            response_text = "Thanks! Please share your contact (phone/email/Telegram handle) so the vendor can reach you."
                            reply_markup = None
                        elif bu.state == "awaiting_contact" and bu.temp_query_id:
                            # Update the Query.contact and notify vendor
                            from queries.models import Query
                            try:
                                qid = int(bu.temp_query_id)
                                q = Query._default_manager.filter(id=qid).first()
                            except Exception:
                                q = None
                            if q:
                                q.contact = text.strip()
                                # Persist chat id if available for future vendor-triggered updates
                                try:
                                    q.customer_chat_id = str(chat_id)
                                except Exception:
                                    pass
                                q.save(update_fields=["contact"])
                                # Push notify vendor
                                try:
                                    from notifications.views import send_web_push_to_vendor
                                    vendor = q.vendor or (getattr(q.order, "vendor", None))
                                    if vendor:
                                        send_web_push_to_vendor(vendor, "New customer query", "New general question received")
                                except Exception:
                                    pass
                            bu.state = ""
                            bu.temp_query_id = ""
                            bu.save(update_fields=["state", "temp_query_id"])
                            response_text = "✅ Got it! The vendor has received your question and contact. They'll reach out to you soon."
                            reply_markup = None
                        else:
                            response_text = "I received your message. Use /help to see commands."
                            reply_markup = None
                    except Exception:
                        response_text = "I received your message. Use /help to see commands."
                        reply_markup = None
                elif text.startswith("/assets"):
                    response_text = bot_handlers.handle_assets()
                    reply_markup = {}
                elif text.startswith("/rate"):
                    parts = text.split()
                    if len(parts) >= 2:
                        response_text = bot_handlers.handle_rate(parts[1])
                        reply_markup = None
                    else:
                        response_text = "Usage: /rate ASSET_SYMBOL"
                        reply_markup = None
                elif text.startswith("/create_order"):
                    response_text = bot_handlers.handle_create_order_placeholder()
                    reply_markup = None
                elif text.startswith("/submit_txn"):
                    response_text = bot_handlers.handle_submit_transaction_placeholder()
                    reply_markup = None
                elif text.startswith("/query"):
                    q = text[len("/query"):].strip()
                    response_text = bot_handlers.handle_submit_query(q)
                    reply_markup = None
                else:
                    response_text = "I received your message. Use /help to see commands."
                    reply_markup = None

            # Send response back to Telegram
            from .telegram_service import TelegramBotService
            telegram_service = TelegramBotService()
            telegram_service.chat_id = str(chat_id)

            result = telegram_service.send_message(
                response_text or "",
                chat_id=str(chat_id),
                reply_markup=reply_markup,
            )

            if not result["success"]:
                logger.error(f"Failed to send response to Telegram: {result.get('error')}")

        elif "callback_query" in update_data:
            # Handle button callbacks
            callback_query = update_data["callback_query"]
            logger.info(f"Callback query: {callback_query}")

            # Handle callback queries for inline keyboards
            from . import bot_handlers
            from .models import BotUser
            from typing import Any, cast

            chat_id = callback_query["message"]["chat"]["id"]
            data = callback_query["data"]

            # Get vendor information from BotUser
            vendor_id = None
            try:
                bot_user = cast(Any, BotUser).objects.get(chat_id=str(chat_id))
                vendor_id = bot_user.vendor.id if bot_user.vendor else None
            except Exception:
                    vendor_id = None

            # Special flow: continue to receive details then proof after vendor acceptance
            if data.startswith("cont_recv_"):
                try:
                    order_id = int(data.replace("cont_recv_", ""))
                    from .models import BotUser as _BU
                    bu = cast(Any, _BU)._default_manager.get(chat_id=str(chat_id))
                    bu.state = "awaiting_receiving"
                    bu.temp_order_id = str(order_id)
                    bu.save(update_fields=["state", "temp_order_id"])
                    # Personalize with vendor trust signal if available
                    try:
                        from orders.models import Order as _Order
                        order = _Order._default_manager.get(id=order_id)
                        from accounts.models import Vendor as _Vendor
                        v = getattr(order, "vendor", None)
                        vname = getattr(v, "name", "the vendor")
                        # Count completed transactions
                        from transactions.models import Transaction as _Txn
                        success_count = _Txn._default_manager.filter(order__vendor=v, status="completed").count() if v else 0
                        response_text = (
                            f"Great! {vname} has accepted your order. {vname} has completed {success_count} successful trades here.\n"
                            "Please enter your receiving details (bank account or wallet address)."
                        )
                        # Add Contact Vendor + navigation buttons
                        tuser = (getattr(v, "telegram_username", "") or "").lstrip("@") if v else ""
                        buttons = []
                        if tuser:
                            buttons.append([{"text": "📨 Contact Vendor", "url": f"https://t.me/{tuser}"}])
                        buttons.append([
                            {"text": "🔙 Back", "callback_data": "help"},
                            {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
                        ])
                        reply_markup = {"inline_keyboard": buttons}
                    except Exception:
                        response_text = "Please enter your receiving details (bank account or wallet address)."
                        reply_markup = None
                except Exception:
                    response_text, reply_markup = ("Invalid state. Please try again.", None)
            elif data.startswith("cont_upload_"):
                try:
                    order_id = int(data.replace("cont_upload_", ""))
                    from .models import BotUser as _BU
                    bu = cast(Any, _BU)._default_manager.get(chat_id=str(chat_id))
                    bu.state = "awaiting_proof"
                    bu.temp_order_id = str(order_id)
                    bu.save(update_fields=["state", "temp_order_id"])
                    # Personalize with vendor trust signal if available
                    try:
                        from orders.models import Order as _Order
                        order = _Order._default_manager.get(id=order_id)
                        v = getattr(order, "vendor", None)
                        vname = getattr(v, "name", "the vendor")
                        from transactions.models import Transaction as _Txn
                        success_count = _Txn._default_manager.filter(order__vendor=v, status="completed").count() if v else 0
                        response_text = (
                            f"{vname} has accepted your order. {vname} has completed {success_count} successful trades here.\n"
                            "Please upload your payment/on-chain proof now (image or document)."
                        )
                        tuser = (getattr(v, "telegram_username", "") or "").lstrip("@") if v else ""
                        buttons = []
                        if tuser:
                            buttons.append([{"text": "📨 Contact Vendor", "url": f"https://t.me/{tuser}"}])
                        buttons.append([
                            {"text": "🔙 Back", "callback_data": "help"},
                            {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
                        ])
                        reply_markup = {"inline_keyboard": buttons}
                    except Exception:
                        response_text = "Please upload your payment/on-chain proof now (image or document)."
                        reply_markup = None
                except Exception:
                    response_text, reply_markup = ("Invalid state. Please try again.", None)
            elif data.startswith("contact_vendor@"):
                # Backward-compat: keep a textual response if an old client sends this callback
                handle = data.replace("contact_vendor@", "").lstrip("@")
                response_text = f"You can DM the vendor here: https://t.me/{handle}"
                reply_markup = None
            elif data == "switch_vendor":
                # User clicked the "Switch Vendor" inline button - prompt them to send vendor identifier
                try:
                    from .models import BotUser as _BU
                    bu = cast(Any, _BU)._default_manager.update_or_create(
                        chat_id=str(chat_id), defaults={"is_subscribed": True, "state": "awaiting_vendor"}
                    )
                except Exception:
                    pass
                response_text = "Please send the vendor's username, ID, or code to link this chat to that vendor."
                reply_markup = None
            else:
                response_text, reply_markup = bot_handlers.handle_callback_query(data, vendor_id, str(chat_id))

            # Send response back to Telegram
            from .telegram_service import TelegramBotService
            telegram_service = TelegramBotService()
            telegram_service.chat_id = str(chat_id)

            result = telegram_service.send_message(
                response_text or "",
                chat_id=str(chat_id),
                reply_markup=reply_markup,
            )

            if not result["success"]:
                logger.error(f"Failed to send response to Telegram: {result.get('error')}")

        else:
            logger.info("Unknown Telegram update type")

        return JsonResponse({"status": "ok"})

    except Exception as e:
        logger.error(f"Error in telegram_webhook: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def set_telegram_webhook(request):
    """Set the Telegram webhook URL."""
    try:
        data = json.loads(request.body or b"{}")
        webhook_url = data.get("webhook_url")
        
        # Allow defaulting to settings if not provided in payload
        if not webhook_url:
            default_url = getattr(settings, "TELEGRAM_WEBHOOK_URL", "")
            default_url = str(default_url).strip() if default_url is not None else ""
            if default_url:
                webhook_url = default_url
            else:
                return JsonResponse({"error": "webhook_url is required (or set TELEGRAM_WEBHOOK_URL in settings/.env)"}, status=400)
        
        from .telegram_service import TelegramBotService
        telegram_service = TelegramBotService()
        
        result = telegram_service.set_webhook(webhook_url)
        
        if result["success"]:
            return JsonResponse({"status": "success", "message": "Webhook set successfully"})
        else:
            return JsonResponse({"error": result.get("error")}, status=500)
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@require_http_methods(["GET"])
def telegram_webhook_info(request):
    """Get information about the current webhook."""
    try:
        from .telegram_service import TelegramBotService
        telegram_service = TelegramBotService()
        
        result = telegram_service.get_webhook_info()
        
        if result["success"]:
            return JsonResponse(result["webhook_info"])
        else:
            return JsonResponse({"error": result.get("error")}, status=500)
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
