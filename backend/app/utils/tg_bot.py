import httpx
import os
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)
load_dotenv()

BOT_TOKEN = os.getenv("TG_BOT_TOKEN")
CHAT_ID = os.getenv("TG_CHAT_ID")

async def send_tg_message(text: str):
    """Отправка сообщения в Telegram"""
    if not BOT_TOKEN or not CHAT_ID:
        logger.warning("⚠️ Telegram bot not configured")
        return False
    
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                url,
                json={
                    "chat_id": CHAT_ID,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True
                }
            )
            response.raise_for_status()
            logger.info("✅ Message sent to Telegram")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to send to Telegram: {e}")
            return False
