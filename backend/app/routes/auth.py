from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import shutil
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv

from app.database import get_db_connection, hash_password, verify_password
from app.auth import get_current_user

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# SMTP настройки (вынести из функции)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.yandex.ru")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    full_name: str
    email: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar: Optional[str] = None
    birthday: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birthday: Optional[str] = None


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_email(email: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1", (email,)
        )
        return cursor.fetchone()


def generate_reset_token():
    """Генерирует уникальный токен для сброса пароля"""
    return secrets.token_urlsafe(32)


def send_reset_email(to_email: str, reset_link: str):
    """Отправляет письмо для сброса пароля"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    import os
    from dotenv import load_dotenv

    load_dotenv()

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.yandex.ru")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

    subject = "Сброс пароля - Hotel Assistant"

    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Сброс пароля</title>
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f0f4f8;
            }}
            .container {{
                max-width: 550px;
                margin: 0 auto;
                padding: 20px;
            }}
            .card {{
                background: white;
                border-radius: 24px;
                box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                padding: 45px 20px;
                text-align: center;
            }}
            .logo-emoji {{
                font-size: 64px;
                display: inline-block;
            }}
            .title {{
                color: white;
                font-size: 26px;
                font-weight: 600;
                margin: 15px 0 5px 0;
            }}
            .subtitle {{
                color: rgba(255,255,255,0.85);
                font-size: 14px;
            }}
            .content {{
                padding: 35px 30px;
            }}
            .greeting {{
                font-size: 22px;
                font-weight: 600;
                color: #1e293b;
                margin: 0 0 15px 0;
            }}
            .message {{
                color: #475569;
                line-height: 1.6;
                margin: 20px 0;
            }}
            .button {{
                text-align: center;
                margin: 35px 0 25px 0;
            }}
            .btn {{
                display: inline-block;
                background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                color: white !important;
                text-decoration: none;
                padding: 14px 35px;
                border-radius: 50px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
            }}
            .warning {{
                background: #fef2f2;
                border-left: 4px solid #ef4444;
                padding: 14px 18px;
                border-radius: 12px;
                margin: 25px 0;
                font-size: 13px;
                color: #b91c1c;
            }}
            .link-box {{
                background: #f8fafc;
                padding: 14px;
                border-radius: 12px;
                word-break: break-all;
                font-size: 13px;
                color: #64748b;
                margin: 20px 0;
                border: 1px solid #e2e8f0;
            }}
            .footer {{
                background: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            }}
            .footer-text {{
                color: #94a3b8;
                font-size: 12px;
                margin: 5px 0;
            }}
            @media (max-width: 550px) {{
                .content {{
                    padding: 25px 20px;
                }}
                .btn {{
                    padding: 12px 28px;
                    font-size: 14px;
                }}
                .logo-emoji {{
                    font-size: 50px;
                }}
                .title {{
                    font-size: 22px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="logo-emoji">🏨</div>
                    <h1 class="title">Hotel Assistant</h1>
                    <div class="subtitle">Система адаптации персонала</div>
                </div>
                
                <div class="content">
                    <h2 class="greeting">Здравствуйте!</h2>
                    
                    <p class="message">
                        Вы запросили сброс пароля для вашего аккаунта.
                    </p>
                    
                    <div class="button">
                        <a href="{reset_link}" class="btn">Сбросить пароль</a>
                    </div>
                    
                    <div class="warning">
                        ⚠️ Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                    </div>
                    
                    <div class="link-box">
                        <strong>Ссылка для сброса (если кнопка не работает):</strong><br>
                        {reset_link}
                    </div>
                    
                    <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 15px;">
                        Ссылка действительна 24 часа
                    </p>
                </div>
                
                <div class="footer">
                    <p class="footer-text">© 2026 Hotel Assistant</p>
                    <p class="footer-text">Автоматическое сообщение, отвечать не нужно</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"✅ Письмо для сброса пароля отправлено на {to_email}")
        return True
    except Exception as e:
        print(f"❌ Ошибка отправки: {e}")
        return False


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = get_user_by_email(request.email)

    if not user:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = create_access_token(
        {"sub": str(user["id"]), "email": user["email"], "role": user["role"]}
    )

    user_id = user["id"]
    email = user["email"]
    role = user["role"]
    first_name = user["first_name"] if user["first_name"] else ""
    last_name = user["last_name"] if user["last_name"] else ""
    full_name = (
        user["full_name"] if user["full_name"] else f"{first_name} {last_name}".strip()
    )
    avatar = user["avatar"] if user["avatar"] else None
    birthday = user["birthday"] if user["birthday"] else None

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user_id,
        full_name=full_name,
        email=email,
        role=role,
        first_name=first_name,
        last_name=last_name,
        avatar=avatar,
        birthday=birthday,
    )


@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Получить профиль текущего пользователя"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, first_name, last_name, full_name, role, avatar, birthday FROM users WHERE id = ?",
            (current_user["id"],),
        )
        user = cursor.fetchone()

    if not user:
        raise HTTPException(404, "Пользователь не найден")

    return {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "full_name": user["full_name"],
        "role": user["role"],
        "avatar": user["avatar"],
        "birthday": user["birthday"],
    }


@router.put("/me")
async def update_user_profile(
    profile: UserUpdate, current_user: dict = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        updates = []
        values = []

        if profile.first_name is not None:
            updates.append("first_name = ?")
            values.append(profile.first_name)
        if profile.last_name is not None:
            updates.append("last_name = ?")
            values.append(profile.last_name)
        if profile.birthday is not None:
            updates.append("birthday = ?")
            values.append(profile.birthday)

        if updates:
            updates.append(
                "full_name = COALESCE(first_name || ' ' || last_name, full_name)"
            )
            values.append(current_user["id"])
            cursor.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values
            )

    return {"message": "Профиль обновлён"}


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...), current_user: dict = Depends(get_current_user)
):
    print(
        f"Загрузка аватара для пользователя {current_user['id']}, файл: {file.filename}"
    )
    print(f"Content-Type: {file.content_type}")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Можно загружать только изображения")

    # ПРАВИЛЬНЫЙ ПУТЬ - папка avatars в корне backend
    avatar_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "avatars")
    os.makedirs(avatar_dir, exist_ok=True)
    print(f"Сохранение аватара в: {avatar_dir}")

    # Удаляем старый аватар, если есть (с обработкой ошибки)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT avatar FROM users WHERE id = ?", (current_user["id"],))
        old_avatar = cursor.fetchone()
        if old_avatar and old_avatar["avatar"]:
            old_path = os.path.join(avatar_dir, old_avatar["avatar"])
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                    print(f"Удалён старый аватар: {old_path}")
                except PermissionError:
                    print(
                        f"⚠️ Не удалось удалить старый аватар (файл занят): {old_path}"
                    )

    # Сохраняем новый аватар
    ext = file.filename.split(".")[-1]
    filename = f"user_{current_user['id']}.{ext}"
    file_path = os.path.join(avatar_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    print(f"Аватар сохранён: {file_path}")

    # Обновляем БД
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET avatar = ? WHERE id = ?", (filename, current_user["id"])
        )

    return {"avatar": filename}


@router.delete("/me/avatar")
async def delete_avatar(current_user: dict = Depends(get_current_user)):
    """Удалить аватар"""
    avatar_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "avatars")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT avatar FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()

        if user and user["avatar"]:
            avatar_path = os.path.join(avatar_dir, user["avatar"])
            if os.path.exists(avatar_path):
                try:
                    os.remove(avatar_path)
                except PermissionError:
                    print(f"⚠️ Не удалось удалить аватар (файл занят): {avatar_path}")

            cursor.execute(
                "UPDATE users SET avatar = NULL WHERE id = ?", (current_user["id"],)
            )

    return {"message": "Аватар удалён"}


# ============ СБРОС ПАРОЛЯ ============


@router.post("/forgot-password")
async def forgot_password(email: str):
    """Запрос на сброс пароля"""
    user = get_user_by_email(email)
    if not user:
        return {
            "message": "Если email зарегистрирован, вы получите ссылку для сброса пароля"
        }

    token = generate_reset_token()
    expires_at = datetime.now() + timedelta(hours=24)

    with get_db_connection() as conn:
        cursor = conn.cursor()
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
        cursor.execute("DELETE FROM password_resets WHERE email = ?", (email,))
        cursor.execute(
            """
            INSERT INTO password_resets (email, token, expires_at)
            VALUES (?, ?, ?)
        """,
            (email, token, expires_at),
        )

    reset_url = f"http://localhost:5173/reset-password?token={token}"
    send_reset_email(email, reset_url)

    return {"message": "Ссылка для сброса пароля отправлена на ваш email"}


@router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    print(f"=== СБРОС ПАРОЛА ===")
    print(f"Токен: {token}")
    print(f"Новый пароль (длина): {len(new_password)}")

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT * FROM password_resets 
            WHERE token = ? AND used = 0 AND expires_at > ?
        """,
            (token, datetime.now()),
        )

        reset = cursor.fetchone()
        print(f"Найден сброс: {reset is not None}")

        if not reset:
            raise HTTPException(400, "Недействительная или просроченная ссылка")

        print(f"Email: {reset['email']}")

        hashed_password = hash_password(new_password)
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (hashed_password, reset["email"]),
        )
        cursor.execute(
            "UPDATE password_resets SET used = 1 WHERE id = ?", (reset["id"],)
        )

    return {"message": "Пароль успешно изменён"}
