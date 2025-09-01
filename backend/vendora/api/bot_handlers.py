"""
Deprecated: This module has been superseded by backend.api.bot_handlers.

It remains only as a guard to prevent accidental imports. Import from
`backend.api` instead.
"""

raise ImportError(
    "backend.vendora.api.bot_handlers is deprecated. Use backend.api.bot_handlers instead."
)
import json
from typing import Dict, Any, Optional

def create_inline_keyboard(buttons: list) -> Dict[str, Any]:
    """Create inline keyboard markup for Telegram"""
    keyboard = []
    for row in buttons:
        keyboard_row = []
        for button in row:
            keyboard_row.append({
                "text": button["text"],
                "callback_data": button["callback_data"]
            })
        keyboard.append(keyboard_row)
    
    return {"inline_keyboard": keyboard}

def handle_start_command(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle /start command - show main menu with Buy/Sell/Query buttons"""
    
    # Create the main menu with Buy/Sell/Query buttons
    keyboard = [
        [
            {"text": "🟢 Buy", "callback_data": "buy"},
            {"text": "🔴 Sell", "callback_data": "sell"}
        ],
        [
            {"text": "❓ Query", "callback_data": "query"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(keyboard)
    
    return {
        "text": "🎉 Welcome to Vendora Bot!\n\nChoose what you'd like to do:",
        "reply_markup": reply_markup
    }

def handle_buy_command(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle buy command - show available assets"""
    
    # Available assets (you can fetch this from your rates API)
    available_assets = ["BTC", "ETH", "USDT", "BNB", "ADA"]
    
    # Create asset selection buttons
    keyboard = []
    for asset in available_assets:
        keyboard.append([{"text": asset, "callback_data": f"asset_{asset}"}])
    
    # Add back button
    keyboard.append([{"text": "⬅️ Back to Menu", "callback_data": "back_to_menu"}])
    
    reply_markup = create_inline_keyboard(keyboard)
    
    return {
        "text": "🟢 Buy Cryptocurrency\n\nSelect the asset you want to buy:",
        "reply_markup": reply_markup
    }

def handle_sell_command(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle sell command - show available assets"""
    
    # Available assets (you can fetch this from your rates API)
    available_assets = ["BTC", "ETH", "USDT", "BNB", "ADA"]
    
    # Create asset selection buttons
    keyboard = []
    for asset in available_assets:
        keyboard.append([{"text": asset, "callback_data": f"asset_{asset}"}])
    
    # Add back button
    keyboard.append([{"text": "⬅️ Back to Menu", "callback_data": "back_to_menu"}])
    
    reply_markup = create_inline_keyboard(keyboard)
    
    return {
        "text": "🔴 Sell Cryptocurrency\n\nSelect the asset you want to sell:",
        "reply_markup": reply_markup
    }

def handle_query_command(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle query command - ask for order ID or general question"""
    
    keyboard = [
        [
            {"text": "📋 Check Order Status", "callback_data": "check_order"},
            {"text": "❓ General Question", "callback_data": "general_question"}
        ],
        [
            {"text": "⬅️ Back to Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(keyboard)
    
    return {
        "text": "❓ Query & Support\n\nWhat would you like to know?",
        "reply_markup": reply_markup
    }

def handle_check_order(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle order status check"""
    return {
        "text": "📋 Order Status Check\n\nPlease enter your Order ID (e.g., ORD-12345):",
        "reply_markup": None
    }

def handle_general_question(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle general question"""
    return {
        "text": "❓ General Question\n\nPlease type your question and we'll get back to you as soon as possible.",
        "reply_markup": None
    }

def handle_back_to_menu(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle back to menu button"""
    return handle_start_command(chat_id, bot_user)

def handle_asset_selection(chat_id: str, asset: str, bot_user=None) -> Dict[str, Any]:
    """Handle asset selection for buy/sell"""
    return {
        "text": f"Enter the amount of {asset} you want to trade:\n\nExample: 100 or 0.5",
        "reply_markup": None
    }

def handle_amount_confirmation(chat_id: str, asset: str, amount: float, bot_user=None) -> Dict[str, Any]:
    """Handle amount confirmation"""
    
    # Create confirmation buttons
    keyboard = [
        [
            {"text": "✅ Confirm", "callback_data": f"confirm_{asset}_{amount}"},
            {"text": "❌ Cancel", "callback_data": "cancel_order"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(keyboard)
    
    return {
        "text": f"📋 Order Confirmation\n\nAsset: {asset}\nAmount: {amount}\n\nPlease confirm your order:",
        "reply_markup": reply_markup
    }

def handle_order_confirmed(chat_id: str, asset: str, amount: float, bot_user=None) -> Dict[str, Any]:
    """Handle confirmed order"""
    
    # Generate order ID (you can implement proper order creation here)
    import uuid
    order_id = f"ORD-{str(uuid.uuid4())[:8].upper()}"
    
    # Create order status button
    keyboard = [
        [
            {"text": "📋 Check Order Status", "callback_data": "check_order"},
            {"text": "🏠 Back to Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(keyboard)
    
    return {
        "text": f"🎉 Order Created Successfully!\n\nOrder ID: {order_id}\nAsset: {asset}\nAmount: {amount}\n\nYour order has been sent to the vendor. You'll be notified when it's processed.",
        "reply_markup": reply_markup
    }

def handle_order_cancelled(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle cancelled order"""
    return {
        "text": "❌ Order Cancelled\n\nNo worries! You can always create a new order by typing /start",
        "reply_markup": None
    }

def handle_help_command(chat_id: str, bot_user=None) -> Dict[str, Any]:
    """Handle /help command"""
    
    keyboard = [
        [
            {"text": "🏠 Back to Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(keyboard)
    
    help_text = """📚 Vendora Bot Help

Available Commands:
/start - Show main menu
/buy - Buy cryptocurrency
/sell - Sell cryptocurrency
/query - Ask questions or check order status
/help - Show this help message

How to use:
1. Click /start to see the main menu
2. Choose Buy, Sell, or Query
3. Follow the prompts to complete your request

Need help? Contact support through the Query option."""
    
    return {
        "text": help_text,
        "reply_markup": reply_markup
    }
