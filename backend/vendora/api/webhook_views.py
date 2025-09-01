"""
Deprecated: This module has been superseded by backend.api.webhook_views.

It remains only as a guard to prevent accidental imports. Import from
`backend.api` instead.
"""

raise ImportError(
    "backend.vendora.api.webhook_views is deprecated. Use backend.api.webhook_views instead."
)
import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from .models import BotUser
from .telegram_service import TelegramBotService
from .bot_handlers import handle_start_command, handle_buy_command, handle_sell_command, handle_query_command

logger = logging.getLogger(__name__)

# Initialize Telegram bot service
bot_service = TelegramBotService()

@csrf_exempt
@require_http_methods(["POST"])
def telegram_webhook(request):
    """Handle incoming Telegram webhook updates"""
    try:
        # Parse the update
        update_data = json.loads(request.body)
        logger.info(f"Received update: {update_data}")
        
        # Handle different types of updates
        if "message" in update_data:
            message = update_data["message"]
            chat_id = str(message["chat"]["id"])
            text = message.get("text", "")
            
            # Create or update BotUser
            bot_user, created = BotUser.objects.update_or_create(
                chat_id=chat_id,
                defaults={
                    "is_subscribed": True,
                    "state": "IDLE"
                }
            )
            
            # Handle commands
            if text == "/start":
                response = handle_start_command(chat_id, bot_user)
            elif text == "/buy":
                response = handle_buy_command(chat_id, bot_user)
            elif text == "/sell":
                response = handle_sell_command(chat_id, bot_user)
            elif text == "/query":
                response = handle_query_command(chat_id, bot_user)
            elif text == "/help":
                response = {
                    "text": "Available commands:\n/start - Start the bot\n/buy - Buy cryptocurrency\n/sell - Sell cryptocurrency\n/query - Ask a question",
                    "reply_markup": None
                }
            else:
                # Handle other messages based on user state
                response = handle_user_message(chat_id, bot_user, text)
            
            # Send response immediately
            if response:
                bot_service.send_message(
                    chat_id=chat_id,
                    text=response["text"],
                    reply_markup=response.get("reply_markup")
                )
            
            return JsonResponse({"status": "ok"})
            
        elif "callback_query" in update_data:
            # Handle button callbacks
            callback_query = update_data["callback_query"]
            chat_id = str(callback_query["message"]["chat"]["id"])
            data = callback_query["data"]
            
            response = handle_callback_query(chat_id, data)
            if response:
                bot_service.send_message(
                    chat_id=chat_id,
                    text=response["text"],
                    reply_markup=response.get("reply_markup")
                )
            
            return JsonResponse({"status": "ok"})
            
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    return JsonResponse({"status": "ok"})

def handle_user_message(chat_id, bot_user, text):
    """Handle user messages based on their current state"""
    if bot_user.state == "WAITING_FOR_ASSET":
        # User is selecting asset for buy/sell
        return handle_asset_selection(chat_id, bot_user, text)
    elif bot_user.state == "WAITING_FOR_AMOUNT":
        # User is entering amount
        return handle_amount_input(chat_id, bot_user, text)
    elif bot_user.state == "WAITING_FOR_CONFIRMATION":
        # User is confirming order
        return handle_order_confirmation(chat_id, bot_user, text)
    
    # Default response for unknown messages
    return {
        "text": "Please use the menu buttons or type /start to begin.",
        "reply_markup": None
    }

def handle_callback_query(chat_id, data):
    """Handle button callback queries"""
    if data == "buy":
        return handle_buy_command(chat_id, None)
    elif data == "sell":
        return handle_sell_command(chat_id, None)
    elif data == "query":
        return handle_query_command(chat_id, None)
    elif data.startswith("asset_"):
        asset = data.replace("asset_", "")
        return handle_asset_selection(chat_id, None, asset)
    
    return None

def handle_asset_selection(chat_id, bot_user, asset):
    """Handle asset selection for buy/sell"""
    if not bot_user:
        bot_user = BotUser.objects.get(chat_id=chat_id)
    
    bot_user.temp_data["selected_asset"] = asset
    bot_user.state = "WAITING_FOR_AMOUNT"
    bot_user.save()
    
    return {
        "text": f"Enter the amount of {asset} you want to trade:",
        "reply_markup": None
    }

def handle_amount_input(chat_id, bot_user, amount):
    """Handle amount input from user"""
    if not bot_user:
        bot_user = BotUser.objects.get(chat_id=chat_id)
    
    try:
        amount_float = float(amount)
        bot_user.temp_data["amount"] = amount_float
        bot_user.state = "WAITING_FOR_CONFIRMATION"
        bot_user.save()
        
        asset = bot_user.temp_data.get("selected_asset", "Unknown")
        return {
            "text": f"Confirm your order:\nAsset: {asset}\nAmount: {amount_float}\n\nType 'confirm' to proceed or 'cancel' to start over.",
            "reply_markup": None
        }
    except ValueError:
        return {
            "text": "Please enter a valid number for the amount.",
            "reply_markup": None
        }

def handle_order_confirmation(chat_id, bot_user, confirmation):
    """Handle order confirmation"""
    if not bot_user:
        bot_user = BotUser.objects.get(chat_id=chat_id)
    
    if confirmation.lower() == "confirm":
        # Create the order here
        asset = bot_user.temp_data.get("selected_asset")
        amount = bot_user.temp_data.get("amount")
        
        # Reset user state
        bot_user.state = "IDLE"
        bot_user.temp_data = {}
        bot_user.save()
        
        return {
            "text": f"Order created successfully!\nAsset: {asset}\nAmount: {amount}\n\nYour order has been sent to the vendor. You'll be notified when it's processed.",
            "reply_markup": None
        }
    elif confirmation.lower() == "cancel":
        bot_user.state = "IDLE"
        bot_user.temp_data = {}
        bot_user.save()
        
        return {
            "text": "Order cancelled. Type /start to begin again.",
            "reply_markup": None
        }
    
    return {
        "text": "Please type 'confirm' to proceed or 'cancel' to start over.",
        "reply_markup": None
    }

@require_http_methods(["POST"])
def set_telegram_webhook(request):
    """Set Telegram webhook URL"""
    try:
        data = json.loads(request.body)
        webhook_url = data.get("webhook_url")
        
        if not webhook_url:
            return JsonResponse({"error": "webhook_url is required"}, status=400)
        
        # Set webhook via Telegram API
        success = bot_service.set_webhook(webhook_url)
        
        if success:
            return JsonResponse({"status": "success", "message": "Webhook set successfully"})
        else:
            return JsonResponse({"status": "error", "message": "Failed to set webhook"}, status=500)
            
    except Exception as e:
        logger.error(f"Error setting webhook: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@require_http_methods(["GET"])
def telegram_webhook_info(request):
    """Get current webhook info"""
    try:
        info = bot_service.get_webhook_info()
        return JsonResponse(info)
    except Exception as e:
        logger.error(f"Error getting webhook info: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
