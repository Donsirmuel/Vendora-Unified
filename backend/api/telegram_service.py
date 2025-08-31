import requests
import time
import logging
from django.conf import settings
from typing import Dict, Any, Optional
from datetime import datetime
from html import escape

logger = logging.getLogger(__name__)


class TelegramBotService:
    """Service class for interacting with Telegram Bot API."""
    
    def __init__(self):
        # Normalize and trim to avoid whitespace issues
        raw_token = str(getattr(settings, "TELEGRAM_BOT_TOKEN", "")).strip()
        raw_chat = str(getattr(settings, "TELEGRAM_CHAT_ID", "")).strip()
        self.token = str(raw_token).strip()
        self.chat_id = str(raw_chat).strip() or None
        self.base_url = f"https://api.telegram.org/bot{self.token}"
    
    def send_message(self, text: str, parse_mode: str = "HTML", chat_id: str | None = None, reply_markup: dict | None = None) -> Dict[str, Any]:
        """Send a message to the configured Telegram chat."""
        if not self.token:
            logger.warning("Telegram bot token not configured")
            return {"success": False, "error": "Bot token not configured"}
        
        target_chat_id = chat_id or self.chat_id
        if not target_chat_id:
            logger.warning("Telegram chat ID not configured")
            return {"success": False, "error": "Chat ID not configured"}
        
        try:
            payload = {
                "chat_id": target_chat_id,
                "text": text,
                "parse_mode": parse_mode
            }
            
            # Add reply_markup if provided
            if reply_markup:
                payload["reply_markup"] = reply_markup

            last_error: Optional[str] = None
            for attempt in range(3):
                try:
                    response = requests.post(
                        f"{self.base_url}/sendMessage",
                        json=payload,
                        timeout=30
                    )
                    if response.status_code == 200:
                        result = response.json()
                        if result.get("ok"):
                            logger.info(f"Message sent successfully to Telegram: {text[:50]}...")
                            return {"success": True, "message_id": result["result"]["message_id"]}
                        else:
                            logger.error(f"Telegram API error: {result}")
                            return {"success": False, "error": result.get("description", "Unknown error")}
                    else:
                        last_error = f"HTTP {response.status_code}: {response.text}"
                        logger.error(f"HTTP error {response.status_code}: {response.text}")
                except requests.exceptions.RequestException as e:
                    last_error = str(e)
                    logger.warning(f"Attempt {attempt+1} to send Telegram message failed: {e}")
                # backoff before next attempt
                if attempt < 2:
                    time.sleep(1.5 * (attempt + 1))

            return {"success": False, "error": last_error or "Unknown network error"}
        except Exception as e:
            logger.error(f"Unexpected error sending to Telegram: {e}")
            return {"success": False, "error": str(e)}
    
    def send_broadcast_message(self, broadcast_message) -> Dict[str, Any]:
        """Send a formatted broadcast message to Telegram."""
        # Format the message based on type
        emoji_map = {
            "asset_added": "🆕",
            "rate_updated": "📈",
            "order_status": "📋",
            "general": "📢"
        }
        
        emoji = emoji_map.get(broadcast_message.message_type, "📢")
        
        # Escape user-provided fields to avoid HTML parse errors
        safe_title = escape(str(broadcast_message.title))
        safe_vendor = escape(str(broadcast_message.vendor.name))
        safe_type = escape(str(broadcast_message.get_message_type_display()))
        safe_content = escape(str(broadcast_message.content))

        # Create formatted message
        message_text = f"""
{emoji} <b>{safe_title}</b>

📝 <b>Type:</b> {safe_type}
👤 <b>Vendor:</b> {safe_vendor}
⏰ <b>Time:</b> {broadcast_message.created_at.strftime('%Y-%m-%d %H:%M:%S')}

{safe_content}

---
<i>Sent via Vendora PWA</i>
        """.strip()
        
        return self.send_message(message_text)
    
    def set_webhook(self, webhook_url: str) -> Dict[str, Any]:
        """Set webhook for receiving updates from Telegram."""
        if not self.token or self.token == '':
            return {"success": False, "error": "Bot token not configured"}
        
        try:
            payload = {"url": webhook_url}
            response = requests.post(
                f"{self.base_url}/setWebhook",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"Webhook set successfully: {webhook_url}")
                    return {"success": True}
                else:
                    logger.error(f"Failed to set webhook: {result}")
                    return {"success": False, "error": result.get("description", "Unknown error")}
            else:
                logger.error(f"HTTP error setting webhook: {response.status_code}")
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Error setting webhook: {e}")
            return {"success": False, "error": str(e)}
    
    def get_webhook_info(self) -> Dict[str, Any]:
        """Get current webhook information."""
        if not self.token or self.token == '':
            return {"success": False, "error": "Bot token not configured"}
        
        try:
            response = requests.get(f"{self.base_url}/getWebhookInfo", timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    return {"success": True, "webhook_info": result["result"]}
                else:
                    return {"success": False, "error": result.get("description", "Unknown error")}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Error getting webhook info: {e}")
            return {"success": False, "error": str(e)}
