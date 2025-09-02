from typing import Dict, Any, Tuple, Optional
from django.urls import reverse
from django.conf import settings
from .telegram_service import TelegramBotService


def create_inline_keyboard(buttons: list) -> dict:
    """Create inline keyboard markup for Telegram."""
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


def handle_start_command() -> Tuple[str, dict]:
    """Handle /start command with Buy/Sell/Query buttons."""
    text = "Welcome to Vendora Bot! 🚀\n\nWhat would you like to do today?"
    
    buttons = [
        [
            {"text": "🛒 Buy", "callback_data": "buy"},
            {"text": "💰 Sell", "callback_data": "sell"}
        ],
        [
            {"text": "❓ Query", "callback_data": "query"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_help_command() -> Tuple[str, dict]:
    """Handle /help command with available options."""
    text = "Available commands:\n\n" \
           "🛒 Buy - Purchase assets\n" \
           "💰 Sell - Sell your assets\n" \
           "❓ Query - Ask questions\n" \
           "📊 Assets - List available assets\n" \
           "💱 Rate - Check current rates\n" \
           "📋 Status - Bot status"
    
    buttons = [
        [
            {"text": "🛒 Buy", "callback_data": "buy"},
            {"text": "💰 Sell", "callback_data": "sell"}
        ],
        [
            {"text": "❓ Query", "callback_data": "query"},
            {"text": "📊 Assets", "callback_data": "assets"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_callback_query(data: str, vendor_id: Optional[int] = None, chat_id: Optional[str] = None) -> Tuple[str, Optional[dict]]:
    """Handle callback queries from inline keyboards."""
    if data == "buy":
        return handle_buy_command(vendor_id)
    elif data == "sell":
        return handle_sell_command(vendor_id)
    elif data == "query":
        return handle_query_command()
    elif data == "assets":
        return handle_assets(), {}
    elif data.startswith("asset_"):
        # asset_{type}_{asset}
        parts = data.split("_", 2)
        if len(parts) == 3:
            _, order_type, asset = parts
            return handle_asset_selection(asset, order_type, vendor_id)
        else:
            asset = data.replace("asset_", "")
            return handle_asset_selection(asset, "buy", vendor_id)
    elif data.startswith("amount_"):
        # Parse: amount_{asset}_{order_type}_{amount}
        parts = data.replace("amount_", "").split("_")
        if len(parts) >= 3:
            asset, order_type, amount = parts[0], parts[1], parts[2]
            return handle_amount_confirmation(asset, order_type, amount, vendor_id, chat_id)
        else:
            # Fallback for old format
            asset, amount = parts[0], parts[1]
            return handle_amount_confirmation(asset, "buy", amount, vendor_id, chat_id)
    elif data.startswith("cont_"):
        parts = data.split("_")
        if len(parts) >= 3 and chat_id:
            asset, order_type = parts[1], parts[2]
            try:
                from .models import BotUser
                from typing import Any, cast
                bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                bu.state = "awaiting_amount"
                bu.temp_asset = asset
                bu.temp_type = order_type
                bu.save(update_fields=["state", "temp_asset", "temp_type"])
            except Exception:
                pass
            return (f"Please enter the amount you want to {order_type} for {asset}.", None)
        return ("Invalid request. Try again.", None)
    elif data.startswith("confirm_"):
        # Parse: confirm_{order_id}_{asset}_{order_type}_{amount}_{vendor_id}
        return handle_order_creation(data, chat_id)
    elif data == "cancel_order":
        return handle_order_cancelled()
    elif data == "back_to_menu":
        return handle_start_command()
    else:
        return "Unknown action. Please try again.", {}


def handle_buy_command(vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Handle buy command with dynamic asset selection from database."""
    text = "What would you like to buy? Select an asset:"
    
    # Fetch available assets from the database
    from rates.models import Rate
    from typing import Any, cast
    
    if vendor_id:
        # Get assets for specific vendor
        rates_qs = cast(Any, Rate).objects.filter(vendor_id=vendor_id)
    else:
        # Get all available assets (fallback)
        rates_qs = cast(Any, Rate).objects.all()
    
    # Get unique assets
    assets = rates_qs.values_list('asset', flat=True).distinct()
    
    buttons = []
    # Create dynamic buttons for available assets
    for i in range(0, len(assets), 2):
        row = []
        row.append({"text": f"{assets[i]}", "callback_data": f"asset_buy_{assets[i]}"})
        if i + 1 < len(assets):
            row.append({"text": f"{assets[i+1]}", "callback_data": f"asset_buy_{assets[i+1]}"})
        buttons.append(row)
    
    # Add back button
    buttons.append([{"text": "🔙 Back to Menu", "callback_data": "back_to_menu"}])
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_sell_command(vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Handle sell command with dynamic asset selection from database."""
    text = "What would you like to sell? Select an asset:"
    
    # Fetch available assets from the database
    from rates.models import Rate
    from typing import Any, cast
    
    if vendor_id:
        # Get assets for specific vendor
        rates_qs = cast(Any, Rate).objects.filter(vendor_id=vendor_id)
    else:
        # Get all available assets (fallback)
        rates_qs = cast(Any, Rate).objects.all()
    
    # Get unique assets
    assets = rates_qs.values_list('asset', flat=True).distinct()
    
    buttons = []
    # Create dynamic buttons for available assets
    for i in range(0, len(assets), 2):
        row = []
        row.append({"text": f"{assets[i]}", "callback_data": f"asset_sell_{assets[i]}"})
        if i + 1 < len(assets):
            row.append({"text": f"{assets[i+1]}", "callback_data": f"asset_sell_{assets[i+1]}"})
        buttons.append(row)
    
    # Add back button
    buttons.append([{"text": "🔙 Back to Menu", "callback_data": "back_to_menu"}])
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_query_command() -> Tuple[str, dict]:
    """Handle query command with options."""
    text = "What type of query do you have?"
    
    buttons = [
        [
            {"text": "📊 Check Order Status", "callback_data": "check_order"}
        ],
        [
            {"text": "❓ General Question", "callback_data": "general_question"}
        ],
        [
            {"text": "🔙 Back to Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_asset_selection(asset: str, order_type: str = "buy", vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Handle asset selection with rate display and amount input."""
    from rates.models import Rate
    from typing import Any, cast
    
    # Get rate information for this asset
    rate_info = "Rate not available"
    if vendor_id:
        try:
            rate = cast(Any, Rate).objects.get(vendor_id=vendor_id, asset=asset)
            if order_type == "buy":
                rate_info = f"Buy Rate: ₦{rate.buy_rate:,.2f} per {asset}"
                bank_details = f"\n\nBank Details:\n{rate.bank_details}" if rate.bank_details else ""
            else:  # sell
                rate_info = f"Sell Rate: ₦{rate.sell_rate:,.2f} per {asset}"
                contract_info = f"\n\nContract Address:\n{rate.contract_address}" if rate.contract_address else ""
        except Rate.DoesNotExist:
            rate_info = f"Rate not available for {asset}"
    
    text = f"{'🛒 BUY' if order_type == 'buy' else '💰 SELL'} {asset}\n\n{rate_info}\n\nTap Continue to enter amount or Cancel to go back."
    buttons = [
        [
            {"text": "✅ Continue", "callback_data": f"cont_{asset}_{order_type}"},
            {"text": "❌ Cancel", "callback_data": "back_to_menu"}
        ],
        [
            {"text": "🔙 Back to Assets", "callback_data": order_type}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_amount_confirmation(asset: str, order_type: str, amount: str, vendor_id: Optional[int] = None, chat_id: Optional[str] = None) -> Tuple[str, dict]:
    """Handle amount confirmation with order details and creation."""
    from rates.models import Rate
    from typing import Any, cast
    import uuid
    
    try:
        amount_decimal = float(amount)
        
        # Get rate and calculate total
        if vendor_id:
            try:
                # Check vendor gating before proceeding
                from accounts.models import Vendor as _Vendor
                from django.utils import timezone
                v = cast(Any, _Vendor).objects.get(id=vendor_id)
                now = timezone.now()
                if not getattr(v, "is_service_active", True):
                    return ("Vendor service inactive. Please contact the vendor.", {})
                texp = getattr(v, "trial_expires_at", None)
                if getattr(v, "is_trial", False) and texp and texp < now:
                    return ("Vendor trial expired. Please contact the vendor.", {})
                if getattr(v, "plan", "trial") not in {"trial", "perpetual"}:
                    pea = getattr(v, "plan_expires_at", None)
                    if pea and pea < now:
                        return ("Vendor subscription expired. Please contact the vendor.", {})

                rate_obj = cast(Any, Rate).objects.get(vendor_id=vendor_id, asset=asset)
                if order_type == "buy":
                    rate = rate_obj.buy_rate
                    total_naira = amount_decimal * float(rate)
                    payment_info = f"\n\n💳 Payment Details:\n{rate_obj.bank_details}" if rate_obj.bank_details else ""
                else:  # sell
                    rate = rate_obj.sell_rate
                    total_naira = amount_decimal * float(rate)
                    payment_info = f"\n\n📬 Send {asset} to:\n{rate_obj.contract_address}" if rate_obj.contract_address else ""
                    
            except Rate.DoesNotExist:
                return "❌ Rate not found for this asset. Please try again.", {}
        else:
            return "❌ Vendor information missing. Please restart the bot.", {}
        
        # Generate unique order ID
        order_id = f"VDR-{uuid.uuid4().hex[:8].upper()}"
        
        text = f"""
🔍 ORDER CONFIRMATION

📋 Order ID: {order_id}
{'🛒' if order_type == 'buy' else '💰'} Type: {order_type.upper()}
💎 Asset: {asset}
📊 Amount: {amount_decimal:,.2f} {asset}
💱 Rate: ₦{rate:,.2f}
💰 Total: ₦{total_naira:,.2f}

{payment_info}

⚠️ Please confirm this order to proceed.
"""
        
        buttons = [
            [
                {"text": "✅ Confirm Order", "callback_data": f"confirm_{order_id}_{asset}_{order_type}_{amount}_{vendor_id}"},
                {"text": "❌ Cancel", "callback_data": "cancel_order"}
            ],
            [
                {"text": "🔙 Back", "callback_data": f"asset_{asset}"},
                {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
            ]
        ]
        
        reply_markup = create_inline_keyboard(buttons)
        return text, reply_markup
        
    except ValueError:
        return "❌ Invalid amount. Please try again.", {}


def handle_order_creation(callback_data: str, chat_id: Optional[str] = None) -> Tuple[str, dict]:
    """Handle actual order creation in database."""
    from orders.models import Order
    from accounts.models import Vendor
    from .models import BotUser
    from typing import Any, cast
    
    try:
        # Parse: confirm_{order_id}_{asset}_{order_type}_{amount}_{vendor_id}
        parts = callback_data.replace("confirm_", "").split("_")
        if len(parts) >= 5:
            order_id, asset, order_type, amount, vendor_id = parts[0], parts[1], parts[2], parts[3], parts[4]
            
            # Get vendor
            vendor = cast(Any, Vendor).objects.get(id=int(vendor_id))
            
            # Create order in database
            order = cast(Any, Order).objects.create(
                vendor=vendor,
                customer_chat_id=chat_id or "",
                asset=asset,
                type=order_type,
                amount=float(amount),
                rate=0,  # We'll update this based on current rate
                status=Order.PENDING,
            )
            
            # Update rate from current rate table
            from rates.models import Rate
            try:
                rate_obj = cast(Any, Rate).objects.get(vendor=vendor, asset=asset)
                if order_type == "buy":
                    order.rate = rate_obj.buy_rate
                else:
                    order.rate = rate_obj.sell_rate
                order.save(update_fields=["rate"])
            except Rate.DoesNotExist:
                pass
            
            # Update BotUser state to expect proof next
            try:
                bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                bu.state = "awaiting_proof"
                bu.temp_order_id = str(order.id)
                bu.temp_type = order_type
                bu.temp_asset = asset
                bu.temp_amount = amount
                bu.save(update_fields=["state", "temp_order_id", "temp_type", "temp_asset", "temp_amount"])
            except BotUser.DoesNotExist:
                pass

            text = f"""
✅ ORDER CREATED!

📋 Order: {order.id}
{'🛒' if order_type == 'buy' else '💰'} Type: {order_type.upper()}
💎 Asset: {asset}
📊 Amount: {amount} {asset}
📍 Status: Pending Proof

Please send a screenshot/photo of your payment or on-chain transfer proof here. You can upload an image or document.
"""

            buttons = [
                [
                    {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
                ]
            ]
            
            reply_markup = create_inline_keyboard(buttons)
            return text, reply_markup
            
        else:
            return "❌ Invalid order data. Please try again.", {}
            
    except Exception as e:
        return f"❌ Error creating order: {str(e)}", {}


def handle_order_confirmed() -> Tuple[str, dict]:
    """Handle order confirmation."""
    text = "🎉 Your order has been confirmed!\n\n" \
           "Order ID: #12345\n" \
           "Status: Pending\n\n" \
           "A vendor will review your order and get back to you soon."
    
    buttons = [
        [
            {"text": "🏠 Back to Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_order_cancelled() -> Tuple[str, dict]:
    """Handle order cancellation."""
    text = "❌ Order cancelled.\n\n" \
           "No worries! You can place a new order anytime."
    
    buttons = [
        [
            {"text": "🛒 Place New Order", "callback_data": "buy"},
            {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_check_order() -> Tuple[str, dict]:
    """Handle order status check."""
    text = "To check your order status, please provide your order ID or contact support."
    
    buttons = [
        [
            {"text": "🏠 Back to Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_general_question() -> Tuple[str, dict]:
    """Handle general questions."""
    text = "For general questions, please contact our support team or use the PWA interface."
    
    buttons = [
        [
            {"text": "🏠 Back to Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_assets() -> str:
    """List assets from rates app."""
    from rates.models import Rate
    try:
        # Accessing the default manager via _default_manager for linting compatibility
        assets_qs = Rate._default_manager.values_list("asset", flat=True).distinct()
        assets = list(assets_qs)
    except Exception:
        return "Could not retrieve assets at this time."
    if not assets:
        return "No assets available yet."
    listing = "\n".join(sorted(set(assets)))
    return f"Available assets:\n{listing}"


def handle_rate(asset_symbol: str) -> str:
    """Get rate for specific asset."""
    from rates.models import Rate
    # Use _default_manager for linting compatibility
    qs = Rate._default_manager.filter(asset__iexact=asset_symbol)
    if not qs.exists():
        return f"No rate found for {asset_symbol}."
    # This aggregates vendors; show a sample
    samples = []
    for r in qs[:5]:
        samples.append(f"{r.asset}: buy {r.buy_rate}, sell {r.sell_rate}")
    return "\n".join(samples)


def handle_create_order_placeholder() -> str:
    """Placeholder for order creation."""
    return "Order creation via bot is not enabled yet. Please use the PWA."


def handle_submit_transaction_placeholder() -> str:
    """Placeholder for transaction submission."""
    return "Submit transaction via bot is not enabled yet. Please use the PWA."


def handle_submit_query(question: str) -> str:
    """Handle query submission."""
    # For now, create a Query placeholder is vendor-scoped; without mapping bot user->vendor/customer, keep informational
    return "Query received. A vendor will respond via PWA."


