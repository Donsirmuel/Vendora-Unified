"""
Deprecated: This module has been superseded by backend.api.telegram_service.

It remains only as a guard to prevent accidental imports. Import from
`backend.api` instead.
"""

raise ImportError(
    "backend.vendora.api.telegram_service is deprecated. Use backend.api.telegram_service instead."
)
import requests
import logging
from typing import Dict, Any, Optional
from django.conf import settings
import time

logger = logging.getLogger(__name__)

class TelegramBotService:
    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN.strip()
        self.base_url = f"https://api.telegram.org/bot{self.token}"
        self.timeout = 10  # Reduced timeout for faster responses
        
    def send_message(self, chat_id: str, text: str, reply_markup: Optional[Dict] = None) -> bool:
        """Send message to Telegram chat with optimized timeout"""
        try:
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }
            
            if reply_markup:
                import json
                payload["reply_markup"] = json.dumps(reply_markup)
            
            # Use shorter timeout for faster responses
            response = requests.post(
                f"{self.base_url}/sendMessage",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Message sent successfully to {chat_id}")
                return True
            else:
                logger.error(f"Failed to send message: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            logger.error(f"Timeout sending message to {chat_id}")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error sending message to {chat_id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending message to {chat_id}: {e}")
            return False
    
    def send_broadcast_message(self, title: str, content: str, chat_ids: list) -> Dict[str, Any]:
        """Send broadcast message to multiple chat IDs with optimized performance"""
        import html
        
        # Escape HTML content
        safe_title = html.escape(title)
        safe_content = html.escape(content)
        
        message_text = f"<b>{safe_title}</b>\n\n{safe_content}"
        
        success_count = 0
        failed_count = 0
        failed_chats = []
        
        for chat_id in chat_ids:
            try:
                if self.send_message(chat_id, message_text):
                    success_count += 1
                else:
                    failed_count += 1
                    failed_chats.append(chat_id)
                
                # Small delay to avoid rate limiting
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error sending broadcast to {chat_id}: {e}")
                failed_count += 1
                failed_chats.append(chat_id)
        
        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "failed_chats": failed_chats,
            "total_sent": success_count
        }
    
    def set_webhook(self, webhook_url: str) -> bool:
        """Set Telegram webhook with optimized timeout"""
        try:
            payload = {"url": webhook_url}
            
            response = requests.post(
                f"{self.base_url}/setWebhook",
                json=payload,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"Webhook set successfully to {webhook_url}")
                    return True
                else:
                    logger.error(f"Failed to set webhook: {result}")
                    return False
            else:
                logger.error(f"Failed to set webhook: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error setting webhook: {e}")
            return False
    
    def get_webhook_info(self) -> Dict[str, Any]:
        """Get current webhook information"""
        try:
            response = requests.get(
                f"{self.base_url}/getWebhookInfo",
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get webhook info: {response.status_code}")
                return {"error": "Failed to get webhook info"}
                
        except Exception as e:
            logger.error(f"Error getting webhook info: {e}")
            return {"error": str(e)}
    
    def delete_webhook(self) -> bool:
        """Delete current webhook"""
        try:
            response = requests.post(
                f"{self.base_url}/deleteWebhook",
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info("Webhook deleted successfully")
                    return True
                else:
                    logger.error(f"Failed to delete webhook: {result}")
                    return False
            else:
                logger.error(f"Failed to delete webhook: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting webhook: {e}")
            return False
