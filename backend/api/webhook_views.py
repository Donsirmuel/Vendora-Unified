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
        update_data = json.loads(request.body)
        logger.info(f"Received Telegram webhook: {update_data}")
        
        # Extract message information
        if "message" in update_data:
            message = update_data["message"]
            chat_id = message.get("chat", {}).get("id")
            text = message.get("text", "")
            user = message.get("from", {})
            
            logger.info(f"Message from chat {chat_id}: {text}")
            
            # Handle different types of messages
            if text.startswith("/start"):
                # Parse vendor ID from start command: /start vendor_123
                vendor_id = None
                vendor_obj = None
                if " " in text:
                    parts = text.split(" ")
                    if len(parts) > 1 and parts[1].startswith("vendor_"):
                        token = parts[1].replace("vendor_", "").strip()
                        if token.isdigit():
                            try:
                                vendor_id = int(token)
                            except ValueError:
                                vendor_id = None
                        else:
                            # Try resolve by external_vendor_id code
                            try:
                                from accounts.models import Vendor as _Vendor
                                vendor_obj = _Vendor.objects.get(external_vendor_id=token)
                                try:
                                    vendor_id = int(getattr(vendor_obj, "id", None) or 0)
                                except Exception:
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
                        defaults={"is_subscribed": True}
                    )
                    
                    # Link to vendor if provided (only if vendor is active/allowed)
                    if vendor_id:
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
                        except Vendor.DoesNotExist:
                            pass
                    
                except Exception as e:
                    logger.error(f"Failed to update or create BotUser: {e}")
                
                # Call the proper start command handler
                from . import bot_handlers
                response_text, reply_markup = bot_handlers.handle_start_command()
                
            elif text.startswith("/help"):
                from . import bot_handlers
                response_text, reply_markup = bot_handlers.handle_help_command()
                
            elif text.startswith("/status"):
                response_text = "Bot is running and connected to Vendora PWA!"
                reply_markup = {}
                
            else:
                from . import bot_handlers
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
                            try:
                                bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                            except BotUser.DoesNotExist:
                                bu = None

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
                                                txn = Transaction(order=order, status="uncompleted")

                                            # Save to FileField (this will save the instance as well)
                                            txn.proof.save(filename, ContentFile(bytes(content)), save=True)
                                            # Ensure status is uncompleted; vendor will complete later
                                            updates = []
                                            if txn.status != "uncompleted":
                                                txn.status = "uncompleted"
                                                updates.append("status")
                                            if updates:
                                                txn.save(update_fields=updates)

                                    # Reset immediate state, but keep linking to the current order for next steps
                                    bu.state = ""
                                    bu.temp_order_id = str(order.id)
                                    bu.save(update_fields=["state", "temp_order_id"])

                                    # Confirm receipt and set status for vendor to complete later
                                    try:
                                        bu.state = ""
                                        bu.save(update_fields=["state"])
                                    except Exception:
                                        pass
                                    if order.status in {Order.ACCEPTED, Order.COMPLETED}:
                                        code_or_id = order.order_code or str(order.id)
                                        response_text = (
                                            f"✅ Your transaction with Order ID: {code_or_id} has been received. "
                                            f"Please await completion by the vendor."
                                        )
                                        reply_markup = None
                    except Exception as e:
                        logger.error(f"Error handling file upload: {e}")
                        response_text = "An error occurred while processing your file. Please try again."
                        reply_markup = None

                elif text and text.strip() and not text.startswith("/"):
                    # Possibly freeform amount entry
                    try:
                        from .models import BotUser
                        from typing import Any, cast
                        bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                        if bu.state == "awaiting_amount" and bu.temp_asset and bu.temp_type:
                            amt = text.strip().replace(",", "")
                            # Only proceed if vendor is active/subscribed
                            vendor_id = bu.vendor.id if bu.vendor else None
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
                            from typing import cast as _cast
                            txn = _cast(Any, Transaction)._default_manager.filter(order_id=int(bu.temp_order_id)).first()
                            if txn:
                                txn.customer_receiving_details = text.strip()
                                txn.save(update_fields=["customer_receiving_details"])
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
            
            # Override chat_id for response
            original_chat_id = telegram_service.chat_id
            telegram_service.chat_id = str(chat_id)
            
            result = telegram_service.send_message(
                response_text, 
                chat_id=str(chat_id),
                reply_markup=reply_markup
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
            except BotUser.DoesNotExist:
                pass
            
            # Special flow: continue to receive details then proof after vendor acceptance
            if data.startswith("cont_recv_"):
                try:
                    order_id = int(data.replace("cont_recv_", ""))
                    from .models import BotUser
                    bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                    bu.state = "awaiting_receiving"
                    bu.temp_order_id = str(order_id)
                    bu.save(update_fields=["state", "temp_order_id"])
                    response_text = "Please enter your receiving details (bank account or wallet address)."
                    reply_markup = None
                except Exception:
                    response_text, reply_markup = ("Invalid state. Please try again.", None)
            elif data.startswith("cont_upload_"):
                try:
                    order_id = int(data.replace("cont_upload_", ""))
                    from .models import BotUser
                    bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                    bu.state = "awaiting_proof"
                    bu.temp_order_id = str(order_id)
                    bu.save(update_fields=["state", "temp_order_id"])
                    response_text = "Please upload your payment/on-chain proof now (image or document)."
                    reply_markup = None
                except Exception:
                    response_text, reply_markup = ("Invalid state. Please try again.", None)
            else:
                response_text, reply_markup = bot_handlers.handle_callback_query(data, vendor_id, str(chat_id))
            
            # Send response back to Telegram
            from .telegram_service import TelegramBotService
            telegram_service = TelegramBotService()
            telegram_service.chat_id = str(chat_id)
            
            result = telegram_service.send_message(
                response_text, 
                chat_id=str(chat_id),
                reply_markup=reply_markup
            )
            
            if not result["success"]:
                logger.error(f"Failed to send response to Telegram: {result.get('error')}")
        
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
