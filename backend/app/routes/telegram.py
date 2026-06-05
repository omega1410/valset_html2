from fastapi import APIRouter, Request, HTTPException
from app.database import get_db_connection
import os
import logging
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TG_BOT_TOKEN")

async def send_tg_message(chat_id: int, text: str):
    """Отправка сообщения пользователю"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True
                }
            )
        except Exception as e:
            logger.error(f"Failed to send message: {e}")


@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Вебхук для Telegram бота"""
    try:
        data = await request.json()
        logger.info(f"Telegram webhook received: {data}")
        
        # Проверяем, что это сообщение
        if "message" not in data:
            return {"ok": True}
        
        message = data["message"]
        chat_id = message["chat"]["id"]
        text = message.get("text", "")
        
        # Команда /start
        if text == "/start":
            await send_tg_message(
                chat_id,
                "🤖 <b>Hotel Assistant Bot</b>\n\n"
                "Для привязки аккаунта отправьте ваш email, который используется в системе.\n\n"
                "После привязки используйте команду /reset для сброса пароля."
            )
            return {"ok": True}
        
        # Привязка email (если пользователь отправил email)
        if "@" in text and "." in text:
            email = text.strip().lower()
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE users SET telegram_chat_id = ? WHERE email = ?",
                    (str(chat_id), email)
                )
                conn.commit()
                
                if cursor.rowcount > 0:
                    await send_tg_message(
                        chat_id,
                        f"✅ <b>Аккаунт привязан!</b>\n\n"
                        f"Email: {email}\n\n"
                        f"Теперь вы можете использовать команду /reset для сброса пароля."
                    )
                else:
                    await send_tg_message(
                        chat_id,
                        "❌ <b>Пользователь с таким email не найден</b>\n\n"
                        "Попробуйте ещё раз или обратитесь к администратору."
                    )
            return {"ok": True}
        
        # Команда /reset
        if text == "/reset":
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT email FROM users WHERE telegram_chat_id = ?",
                    (str(chat_id),)
                )
                user = cursor.fetchone()
                
                if not user:
                    await send_tg_message(
                        chat_id,
                        "❌ <b>Аккаунт не привязан</b>\n\n"
                        "Используйте команду /start для привязки."
                    )
                    return {"ok": True}
                
                # Генерируем токен сброса
                import secrets
                from datetime import datetime, timedelta
                
                token = secrets.token_urlsafe(32)
                expires_at = datetime.now() + timedelta(hours=1)
                
                # Сохраняем токен в БД
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS password_resets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT NOT NULL,
                        token TEXT NOT NULL UNIQUE,
                        expires_at TIMESTAMP NOT NULL,
                        used BOOLEAN DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute(
                    "DELETE FROM password_resets WHERE email = ?",
                    (user["email"],)
                )
                cursor.execute(
                    "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
                    (user["email"], token, expires_at)
                )
                conn.commit()
            
            reset_url = f"https://hotel-assistant.ru/reset-password?token={token}"
            
            await send_tg_message(
                chat_id,
                f"🔐 <b>Сброс пароля</b>\n\n"
                f"Перейдите по ссылке для создания нового пароля:\n\n"
                f"<a href='{reset_url}'>Сбросить пароль</a>\n\n"
                f"⏰ Ссылка действительна 1 час."
            )
            return {"ok": True}
        
        # Неизвестная команда
        await send_tg_message(
            chat_id,
            "🤖 Доступные команды:\n"
            "/start - начать работу\n"
            "/reset - сбросить пароль"
        )
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return {"ok": True}
