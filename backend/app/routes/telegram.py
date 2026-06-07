from fastapi import APIRouter, Request
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
BOT_TOKEN = os.getenv("TG_BOT_TOKEN")

# Хранилище email'ов пользователей (временное)
user_emails = {}

@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Обработчик сообщений от Telegram"""
    try:
        data = await request.json()
        
        if "message" not in data:
            return {"ok": True}
        
        chat_id = data["message"]["chat"]["id"]
        text = data["message"].get("text", "").strip()
        
        # Команда /start
        if text == "/start":
            await send_message(chat_id, 
                "🤖 <b>Бот для сброса пароля Hotel Assistant</b>\n\n"
                "Отправьте мне ваш email, который используете на сайте.\n"
                "После этого вы сможете сбросить пароль командой /reset"
            )
            user_emails[str(chat_id)] = {"step": "awaiting_email"}
            return {"ok": True}
        
        # Команда /reset
        if text == "/reset":
            user_data = user_emails.get(str(chat_id))
            if not user_data or not user_data.get("email"):
                await send_message(chat_id, 
                    "❌ Сначала отправьте ваш email командой /start"
                )
                return {"ok": True}
            
            email = user_data["email"]
            
            # Запрашиваем сброс пароля через твой API
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"http://127.0.0.1:8000/api/auth/forgot-password",
                    params={"email": email}
                )
                result = resp.json()
            
            if "reset_url" in result:
                await send_message(chat_id,
                    f"🔐 <b>Ссылка для сброса пароля</b>\n\n"
                    f"{result['reset_url']}\n\n"
                    f"⏰ Ссылка действительна 1 час.\n\n"
                    f"⚠️ Никому не передавайте эту ссылку!"
                )
            else:
                await send_message(chat_id, f"❌ {result.get('message', 'Ошибка')}")
            
            return {"ok": True}
        
        # Обработка email (когда пользователь отправляет email)
        user_data = user_emails.get(str(chat_id))
        if user_data and user_data.get("step") == "awaiting_email" and "@" in text:
            email = text.strip().lower()
            
            # Проверяем, есть ли такой email в системе
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"http://127.0.0.1:8000/api/auth/forgot-password",
                    params={"email": email}
                )
                result = resp.json()
            
            if "reset_url" in result:
                user_emails[str(chat_id)] = {"step": "ready", "email": email}
                await send_message(chat_id,
                    f"✅ Email <b>{email}</b> успешно привязан!\n\n"
                    f"Теперь используйте команду /reset для сброса пароля."
                )
            else:
                await send_message(chat_id, 
                    f"❌ Email <b>{email}</b> не найден в системе.\n\n"
                    f"Проверьте правильность email или обратитесь к администратору."
                )
            
            return {"ok": True}
        
        # Если ничего не подошло
        await send_message(chat_id, 
            "🤖 Используйте /start для начала работы\n"
            "Или /reset для сброса пароля (после привязки email)"
        )
        
    except Exception as e:
        print(f"Telegram webhook error: {e}")
    
    return {"ok": True}


async def send_message(chat_id: int, text: str):
    """Отправка сообщения в Telegram"""
    if not BOT_TOKEN:
        print("TG_BOT_TOKEN not set")
        return
    
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            })
        except Exception as e:
            print(f"Failed to send message: {e}")
