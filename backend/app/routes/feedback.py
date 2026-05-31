from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


class FeedbackCreate(BaseModel):
    subject: str
    message: str
    type: str = "bug"  # bug, feature, question, other


class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    subject: str
    message: str
    type: str
    status: str
    created_at: str


env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.yandex.ru")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

print(f"Загружено: SMTP_USER={SMTP_USER}")


def send_feedback_email(
    subject: str, message: str, user_name: str, user_email: str, feedback_type: str
):
    """Отправляет уведомление администратору"""
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"⚠️ Email не настроен. Фидбек от {user_name}: {subject}")
        return

    type_emoji = {"bug": "🐛", "feature": "💡", "question": "❓", "other": "📝"}

    body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">Новое сообщение от пользователя</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0;"><strong>Тип:</strong></td>
                    <td style="padding: 8px 0;">{type_emoji.get(feedback_type, '📝')} {feedback_type}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>От:</strong></td>
                    <td style="padding: 8px 0;">{user_name} ({user_email})</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Тема:</strong></td>
                    <td style="padding: 8px 0;">{subject}</td>
                </tr>
            </table>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <strong>Сообщение:</strong>
                <p style="margin-top: 10px; white-space: pre-wrap;">{message}</p>
            </div>
            
            <hr style="margin: 20px 0;">
            <p style="color: #64748b; font-size: 12px;">Отправлено из системы Hotel Assistant</p>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = SMTP_USER  # Отправляем администратору
    msg["Subject"] = f"[Hotel Assistant] {subject}"
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"✅ Фидбек отправлен на email")
    except Exception as e:
        print(f"❌ Ошибка отправки email: {e}")


@router.post("/feedback")
async def create_feedback(
    feedback: FeedbackCreate, user: dict = Depends(get_current_user)
):
    """Отправить обратную связь"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Создаём таблицу если нет
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                user_email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'bug',
                status TEXT DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute(
            """
            INSERT INTO feedback (user_id, user_name, user_email, subject, message, type)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                user["id"],
                user["full_name"],
                user["email"],
                feedback.subject,
                feedback.message,
                feedback.type,
            ),
        )

        feedback_id = cursor.lastrowid
        cursor.execute("SELECT * FROM feedback WHERE id = ?", (feedback_id,))
        new_feedback = cursor.fetchone()

    # Отправляем уведомление администратору
    send_feedback_email(
        feedback.subject,
        feedback.message,
        user["full_name"],
        user["email"],
        feedback.type,
    )

    return {"message": "Спасибо за обратную связь!", "id": feedback_id}


@router.get("/admin/feedback")
async def get_all_feedback(admin: dict = Depends(get_current_user)):
    """Получить все сообщения (только админ)"""
    if admin["role"] != "admin":
        raise HTTPException(403, "Доступ запрещён")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM feedback ORDER BY created_at DESC")
        feedback = cursor.fetchall()

    return [dict(f) for f in feedback]


@router.put("/admin/feedback/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: int, status: str, admin: dict = Depends(get_current_user)
):
    """Изменить статус сообщения (только админ)"""
    if admin["role"] != "admin":
        raise HTTPException(403, "Доступ запрещён")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE feedback SET status = ? WHERE id = ?", (status, feedback_id)
        )

    return {"message": "Статус обновлён"}
