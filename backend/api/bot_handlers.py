from typing import Dict, Any, Tuple, Optional
from django.core.cache import cache
from django.urls import reverse
from django.conf import settings
from .telegram_service import TelegramBotService


def create_inline_keyboard(buttons: list) -> dict:
    """Create inline keyboard markup for Telegram.
    Supports both callback buttons and URL buttons (if 'url' provided).
    """
    keyboard = []
    for row in buttons:
        keyboard_row = []
        for button in row:
            btn = {"text": button["text"]}
            if "url" in button and button["url"]:
                btn["url"] = button["url"]
            else:
                btn["callback_data"] = button.get("callback_data", "noop")
            keyboard_row.append(btn)
        keyboard.append(keyboard_row)

    return {"inline_keyboard": keyboard}


def handle_start_command(vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Handle /start command with personalization, trust signal, and Contact Vendor button."""
    vendor_name = "your vendor"
    vendor_contact_btn = None
    trust_snippet = ""
    bio_snippet = ""
    extras_snippet = ""
    try:
        if vendor_id:
            from accounts.models import Vendor
            from transactions.models import Transaction
            from typing import Any, cast
            v = cast(Any, Vendor).objects.only('id','name','bio','telegram_username').filter(id=vendor_id).first()
            if v:
                vendor_name = getattr(v, "name", vendor_name) or vendor_name
                # Cached trust stats
                cache_key = f"vendor:{v.id}:trust_stats:v1"
                cached = cache.get(cache_key)
                if cached and isinstance(cached, dict):
                    success_count = int(cached.get('success_count') or 0)
                    avg_minutes = cached.get('avg_minutes')
                else:
                    success_count = cast(Any, Transaction).objects.filter(order__vendor=v, status="completed").count()
                    # Compute avg release minutes with DB aggregate then fallback
                    avg_minutes: Optional[int] = None
                    try:
                        from django.db.models import Avg, F, ExpressionWrapper, DurationField
                        qs = cast(Any, Transaction).objects.filter(order__vendor=v, status="completed").exclude(vendor_completed_at__isnull=True).exclude(order__accepted_at__isnull=True)
                        delta_expr = ExpressionWrapper(F('vendor_completed_at') - F('order__accepted_at'), output_field=DurationField())
                        delta = qs.aggregate(avg=Avg(delta_expr)).get('avg')
                        if delta:
                            avg_minutes = max(1, int(delta.total_seconds() // 60))
                    except Exception:
                        vals = list(cast(Any, Transaction).objects.filter(order__vendor=v, status="completed").values_list('vendor_completed_at', 'order__accepted_at')[:100])
                        diffs = []
                        for done, acc in vals:
                            try:
                                if done and acc:
                                    diffs.append((done - acc).total_seconds())
                            except Exception:
                                pass
                        if diffs:
                            avg_minutes = max(1, int((sum(diffs) / len(diffs)) // 60))
                    cache.set(cache_key, {"success_count": success_count, "avg_minutes": avg_minutes}, 300)

                if success_count:
                    trust_snippet = f"\n{vendor_name} has completed {success_count} successful transactions here."
                bio = (getattr(v, "bio", "") or "").strip()
                if bio:
                    bio_snippet = f"\n“{bio[:140]}”"
                if locals().get('avg_minutes'):
                    extras_snippet = f"\n\nWhy trade here?\n• Verified vendor\n• {success_count} successful trades\n• Typical release ~{locals()['avg_minutes']}m"
                tg_user = (getattr(v, "telegram_username", "") or "").lstrip("@")
                if tg_user:
                    vendor_contact_btn = {"text": "📨 Contact Vendor", "url": f"https://t.me/{tg_user}"}
    except Exception:
        pass

    # Wording: when we know the vendor, use "your <name> bot"; otherwise keep generic
    if vendor_id and vendor_name and vendor_name != "your vendor":
        # Use possessive properly: add 's unless name already ends with ' or s'
        possessive = (
            f"{vendor_name}'" if str(vendor_name).endswith("s") and not str(vendor_name).endswith("s'") else f"{vendor_name}'s"
        )
        header = f"Welcome to Vendora — your {possessive} bot! 🚀"
    else:
        header = "Welcome to Vendora — your vendor bot! 🚀"
    text = f"{header}\n\nWhat would you like to do today?{trust_snippet}{bio_snippet}{extras_snippet}"
    
    buttons = [
        [
            {"text": "🛒 Buy", "callback_data": "buy"},
            {"text": "💰 Sell", "callback_data": "sell"}
        ],
        [
            {"text": "📊 Check Order Status", "callback_data": "check_order"},
            {"text": "❓ Help", "callback_data": "help"}
        ]
    ]
    # Insert contact button if available
    if vendor_contact_btn:
        buttons.insert(1, [vendor_contact_btn])
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_help_command(vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Handle /help command, personalize if vendor is known."""
    prefix = "This bot connects you with your vendor on Vendora."
    try:
        if vendor_id:
            from accounts.models import Vendor
            v = Vendor.objects.filter(id=vendor_id).first()
            if v:
                prefix = f"You're chatting with {v.name}'s Vendora bot."
    except Exception:
        pass
    text = prefix + "\n\nAvailable commands:\n\n" \
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
        ],
        [
            {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
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
    elif data == "help":
        return handle_help_command(vendor_id)
    elif data == "assets":
        return handle_assets_panel()
    elif data.startswith("asset_"):
        # asset_{type}_{asset}
        parts = data.split("_", 2)
        if len(parts) == 3:
            _, order_type, asset = parts
        else:
            order_type = "buy"
            asset = data.replace("asset_", "")

        # If no vendor is linked yet, try to infer from Rate table (single-owner asset)
        if not vendor_id and asset:
            try:
                from rates.models import Rate as _Rate
                from typing import Any, cast as _cast
                vendor_ids = list(_cast(Any, _Rate).objects.filter(asset=asset).values_list("vendor_id", flat=True).distinct())
                if len(vendor_ids) == 1:
                    vendor_id = int(vendor_ids[0])
                    # Persist on BotUser for this chat for subsequent steps
                    if chat_id:
                        try:
                            from .models import BotUser as _BotUser
                            bu = _BotUser._default_manager.filter(chat_id=str(chat_id)).first()
                            if bu and (not bu.vendor or getattr(bu.vendor, "id", None) != vendor_id):
                                from accounts.models import Vendor as _Vendor
                                v = _Vendor.objects.filter(id=vendor_id).first()
                                if v:
                                    bu.vendor = v
                                    bu.save(update_fields=["vendor"])
                        except Exception:
                            pass
            except Exception:
                pass

        return handle_asset_selection(asset, order_type, vendor_id)
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
            # Provide a Cancel option specific to the awaiting_amount step
            buttons = [
                [
                    {"text": "❌ Cancel", "callback_data": "cancel_amount"},
                    {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
                ]
            ]
            return (f"Please enter the amount you want to {order_type} for {asset}.", create_inline_keyboard(buttons))
        return ("Invalid request. Try again.", None)
    elif data == "cancel_amount" and chat_id:
        # Only cancel the amount-entry flow; clear awaiting_amount state and related temp fields
        try:
            from .models import BotUser
            from typing import Any, cast
            bu = cast(Any, BotUser)._default_manager.filter(chat_id=str(chat_id)).first()
            if bu and getattr(bu, "state", "") == "awaiting_amount":
                bu.state = ""
                # Clear amount-related temp fields only
                bu.temp_asset = ""
                bu.temp_type = ""
                bu.save(update_fields=["state", "temp_asset", "temp_type"])
        except Exception:
            pass
        # Go back to main menu after canceling amount input
        return handle_start_command()
    elif data.startswith("repeat_"):
        # repeat_{asset}_{order_type}_{amount}
        try:
            _, asset, order_type, amount = data.split("_", 3)
        except ValueError:
            return ("Couldn't parse repeat request. Please start a new trade.", None)
        return handle_amount_confirmation(asset, order_type, amount, vendor_id, chat_id)
    elif data.startswith("confirm_"):
        # Parse: confirm_{order_id}_{asset}_{order_type}_{amount}_{vendor_id}
        return handle_order_creation(data, chat_id)
    elif data == "cancel_order":
        return handle_order_cancelled()
    elif data == "check_order":
        return handle_check_order(chat_id)
    elif data == "general_question":
        return handle_general_question(chat_id, vendor_id)
    elif data == "back_to_menu":
        return handle_start_command()
    elif data.startswith("contact_vendor@"):  # open DM link instruction
        handle = data.replace("contact_vendor@", "").lstrip("@")
        url = f"https://t.me/{handle}" if handle else "https://t.me/"
        return (f"You can contact the vendor directly here: {url}", None)
    else:
        return "Unknown action. Please try again.", {}


def handle_buy_command(vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Handle buy command with dynamic asset selection from database."""
    vendor_label = ""
    if vendor_id:
        try:
            from accounts.models import Vendor
            v = Vendor.objects.filter(id=vendor_id).first()
            if v:
                vendor_label = f" from {v.name}"
        except Exception:
            pass
    text = f"What would you like to buy{vendor_label}? Select an asset:"
    
    # Fetch available assets from the database
    from rates.models import Rate
    from typing import Any, cast
    
    if vendor_id:
        rates_qs = cast(Any, Rate).objects.only('asset').filter(vendor_id=vendor_id)
    else:
        rates_qs = cast(Any, Rate).objects.only('asset')
    assets = list(rates_qs.values_list('asset', flat=True).distinct())
    
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
    vendor_label = ""
    if vendor_id:
        try:
            from accounts.models import Vendor
            v = Vendor.objects.filter(id=vendor_id).first()
            if v:
                vendor_label = f" to {v.name}"
        except Exception:
            pass
    text = f"What would you like to sell{vendor_label}? Select an asset:"
    
    # Fetch available assets from the database
    from rates.models import Rate
    from typing import Any, cast
    
    if vendor_id:
        rates_qs = cast(Any, Rate).objects.only('asset').filter(vendor_id=vendor_id)
    else:
        rates_qs = cast(Any, Rate).objects.only('asset')
    assets = list(rates_qs.values_list('asset', flat=True).distinct())
    
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
                {"text": "🔙 Back", "callback_data": "help"},
                {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
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
    extra_info = ""
    if vendor_id:
        try:
            rate = cast(Any, Rate).objects.only('buy_rate','sell_rate','bank_details','contract_address').get(vendor_id=vendor_id, asset=asset)
            if order_type == "buy":
                rate_info = f"Buy Rate: ₦{rate.buy_rate:,.2f} per {asset}"
                if rate.bank_details:
                    extra_info = f"\n\nBank Details:\n{rate.bank_details}"
            else:  # sell
                rate_info = f"Sell Rate: ₦{rate.sell_rate:,.2f} per {asset}"
                if rate.contract_address:
                    extra_info = f"\n\nContract Address:\n{rate.contract_address}"
        except Rate.DoesNotExist:
            rate_info = f"Rate not available for {asset}"
    
    text = f"{'🛒 BUY' if order_type == 'buy' else '💰 SELL'} {asset}\n\n{rate_info}{extra_info}\n\nTap Continue to enter amount or Cancel to go back."
    buttons = [
        [
            {"text": "✅ Continue", "callback_data": f"cont_{asset}_{order_type}"},
            {"text": "❌ Cancel", "callback_data": "back_to_menu"}
        ],
        [
                {"text": "🔙 Back", "callback_data": order_type},
                {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_amount_confirmation(asset: str, order_type: str, amount: str, vendor_id: Optional[int] = None, chat_id: Optional[str] = None) -> Tuple[str, dict]:
    """Handle amount input: show preview with totals and ask to Confirm/Cancel (no creation yet)."""
    from rates.models import Rate
    from typing import Any, cast
    import uuid
    from decimal import Decimal, InvalidOperation
    
    try:
        amount_decimal = Decimal(str(amount))
    except (InvalidOperation, ValueError):
        return "❌ Invalid amount. Please try again.", {}

    # Get rate and calculate total
    if not vendor_id:
        return "❌ Vendor information missing. Please restart the bot.", {}
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
            rate = Decimal(rate_obj.buy_rate)
        else:
            rate = Decimal(rate_obj.sell_rate)
        total_naira = amount_decimal * rate
    except Rate.DoesNotExist:
        return "❌ Rate not found for this asset. Please try again.", {}

    text = f"""
🔍 ORDER PREVIEW

{'🛒' if order_type == 'buy' else '💰'} Type: {order_type.upper()}
💎 Asset: {asset}
📊 Amount: {amount_decimal:,.2f} {asset}
💱 Rate: ₦{rate:,.2f}
💰 Total: ₦{total_naira:,.2f}

⚠️ Please confirm this order to proceed.
"""
        
    buttons = [
        [
            {"text": "✅ Confirm Order", "callback_data": f"confirm_{asset}_{order_type}_{amount_decimal}_{vendor_id}"},
            {"text": "❌ Cancel", "callback_data": "cancel_order"}
        ],
        [
            {"text": "🔙 Back", "callback_data": f"asset_{asset}"},
            {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
        ]
    ]

    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_order_creation(callback_data: str, chat_id: Optional[str] = None) -> Tuple[str, dict]:
    """Create the order after user confirms, then tell them it's pending acceptance."""
    from orders.models import Order
    from accounts.models import Vendor
    from .models import BotUser
    from typing import Any, cast
    from decimal import Decimal
    
    try:
        # Parse: confirm_{asset}_{order_type}_{amount}_{vendor_id}
        parts = callback_data.replace("confirm_", "").split("_")
        if len(parts) >= 4:
            asset, order_type, amount, vendor_id = parts[0], parts[1], parts[2], parts[3]
            
            # Get vendor
            vendor = cast(Any, Vendor).objects.get(id=int(vendor_id))
            # Respect availability and service gating
            from django.utils import timezone
            now = timezone.now()
            if getattr(vendor, "is_available", True) is False:
                msg = getattr(vendor, "unavailable_message", "Vendor is currently unavailable.") or "Vendor is currently unavailable."
                return (msg, {})
            if not getattr(vendor, "is_service_active", True):
                return ("Vendor service inactive. Please contact the vendor.", {})
            tea = getattr(vendor, "trial_expires_at", None)
            if getattr(vendor, "is_trial", False) and tea and tea < now:
                return ("Vendor trial expired. Please contact the vendor.", {})
            if getattr(vendor, "plan", "trial") not in {"trial", "perpetual"}:
                pea = getattr(vendor, "plan_expires_at", None)
                if pea and pea < now:
                    return ("Vendor subscription expired. Please contact the vendor.", {})
            
            # Create order in database
            order = cast(Any, Order).objects.create(
                vendor=vendor,
                customer_chat_id=chat_id or "",
                asset=asset,
                type=order_type,
                amount=Decimal(str(amount)),
                rate=Decimal("0"),  # We'll update this based on current rate
                status=Order.PENDING,
            )
            
            # Update rate from current rate table and ensure instructions will be set on accept
            from rates.models import Rate
            try:
                rate_obj = cast(Any, Rate).objects.get(vendor=vendor, asset=asset)
                if order_type == "buy":
                    order.rate = Decimal(rate_obj.buy_rate)
                else:
                    order.rate = Decimal(rate_obj.sell_rate)
                order.save(update_fields=["rate"])
            except Rate.DoesNotExist:
                pass
            
            # Keep context but wait for vendor acceptance before asking for proof
            try:
                bu = cast(Any, BotUser)._default_manager.get(chat_id=str(chat_id))
                bu.state = ""
                bu.temp_order_id = str(order.id)
                bu.temp_type = order_type
                bu.temp_asset = asset
                bu.temp_amount = amount
                bu.save(update_fields=["state", "temp_order_id", "temp_type", "temp_asset", "temp_amount"])
            except BotUser.DoesNotExist:
                pass

            # Push notify vendor about new pending order (bot-created)
            try:
                from notifications.views import send_web_push_to_vendor as _send_push
                _send_push(vendor, "New pending order", f"Order {order.order_code or order.pk} created", url="/orders")
            except Exception:
                pass

            text = f"""
Thanks! Your order with Order ID: {order.order_code or order.id} has been created and is pending acceptance from the vendor. You'll be notified when it's accepted.
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


def handle_check_order(chat_id: Optional[str] = None) -> Tuple[str, dict]:
    """Handle order status check: set state and prompt for code/ID."""
    if chat_id:
        try:
            from .models import BotUser
            bu = BotUser._default_manager.filter(chat_id=str(chat_id)).first()
            if bu:
                bu.state = "awaiting_order_status"
                # Clear previous temp order context to avoid confusion
                bu.temp_order_id = ""
                bu.save(update_fields=["state", "temp_order_id"])
        except Exception:
            pass
    text = "Please enter your Order ID or Code (e.g., ORD-..., or a numeric ID)."
    buttons = [
        [
            {"text": "🏠 Back to Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    reply_markup = create_inline_keyboard(buttons)
    return text, reply_markup


def handle_general_question(chat_id: Optional[str] = None, vendor_id: Optional[int] = None) -> Tuple[str, dict]:
    """Start general question flow by setting state and prompting for the question."""
    if chat_id:
        try:
            from .models import BotUser
            bu = BotUser._default_manager.filter(chat_id=str(chat_id)).first()
            if bu:
                bu.state = "awaiting_general_question"
                bu.save(update_fields=["state"])
        except Exception:
            pass
    text = "Please type your question. After that, I'll ask for your contact so the vendor can reach you."
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


def handle_assets_panel() -> Tuple[str, dict]:
    """Assets list with navigation buttons for the callback flow."""
    text = handle_assets()
    buttons = [
        [
            {"text": "🔙 Back", "callback_data": "help"},
            {"text": "🏠 Main Menu", "callback_data": "back_to_menu"}
        ]
    ]
    return text, create_inline_keyboard(buttons)


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


