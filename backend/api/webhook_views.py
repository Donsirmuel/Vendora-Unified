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
                if " " in text:
                    parts = text.split(" ")
                    if len(parts) > 1 and parts[1].startswith("vendor_"):
                        try:
                            vendor_id = int(parts[1].replace("vendor_", ""))
                        except ValueError:
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
                    
                    # Link to vendor if provided
                    if vendor_id:
                        try:
                            vendor = cast(Any, Vendor).objects.get(id=vendor_id)
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
                if text.startswith("/assets"):
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
        data = json.loads(request.body)
        webhook_url = data.get("webhook_url")
        
        if not webhook_url:
            return JsonResponse({"error": "webhook_url is required"}, status=400)
        
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
            return JsonResponse(result["data"])
        else:
            return JsonResponse({"error": result.get("error")}, status=500)
            
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
