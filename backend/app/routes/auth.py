from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import shutil
import secrets
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv

from app.database import get_db_connection, hash_password, verify_password
from app.auth import get_current_user

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

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
        cursor.execute("SELECT * FROM users WHERE email = ? AND is_active = 1", (email,))
        return cursor.fetchone()


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = get_user_by_email(request.email)
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = create_access_token(
        {"sub": str(user["id"]), "email": user["email"], "role": user["role"]}
    )

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user["id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        avatar=user["avatar"],
        birthday=user["birthday"],
    )


@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, first_name, last_name, full_name, role, avatar, birthday FROM users WHERE id = ?",
            (current_user["id"],),
        )
        user = cursor.fetchone()
    return dict(user)


@router.put("/me")
async def update_user_profile(profile: UserUpdate, current_user: dict = Depends(get_current_user)):
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
            updates.append("full_name = COALESCE(first_name || ' ' || last_name, full_name)")
            values.append(current_user["id"])
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
    return {"message": "Профиль обновлён"}


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    avatar_dir = "/var/www/hotel-assistant/backend/avatars"
    os.makedirs(avatar_dir, exist_ok=True)
    
    ext = file.filename.split(".")[-1]
    filename = f"user_{current_user['id']}.{ext}"
    file_path = os.path.join(avatar_dir, filename)
    
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET avatar = ? WHERE id = ?", (filename, current_user["id"]))
    
    return {"avatar": filename}


@router.delete("/me/avatar")
async def delete_avatar(current_user: dict = Depends(get_current_user)):
    avatar_dir = "/var/www/hotel-assistant/backend/avatars"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT avatar FROM users WHERE id = ?", (current_user["id"],))
        user = cursor.fetchone()
        if user and user["avatar"]:
            avatar_path = os.path.join(avatar_dir, user["avatar"])
            if os.path.exists(avatar_path):
                os.remove(avatar_path)
            cursor.execute("UPDATE users SET avatar = NULL WHERE id = ?", (current_user["id"],))
    return {"message": "Аватар удалён"}

@router.post("/forgot-password")
async def forgot_password(email: str):
    """Запрос на сброс пароля"""
    import secrets
    from datetime import datetime, timedelta
    
    user = get_user_by_email(email)
    if not user:
        return {"message": "Email не найден"}
    
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=1)
    
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
            "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
            (email, token, expires_at)
        )
        conn.commit()
    
    reset_url = f"https://hotel-assistant.ru/reset-password?token={token}"
    
    return {"reset_url": reset_url, "token": token}

@router.post("/reset-password")
async def reset_password(token: str, new_password: str):
    """Сброс пароля по токену"""
    from datetime import datetime
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Проверяем токен
        cursor.execute(
            "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > ?",
            (token, datetime.now())
        )
        reset = cursor.fetchone()
        
        if not reset:
            raise HTTPException(400, "Недействительная или просроченная ссылка")
        
        # Хешируем новый пароль
        hashed = hash_password(new_password)
        
        # Обновляем пароль пользователя
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (hashed, reset["email"])
        )
        
        # Помечаем токен как использованный
        cursor.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (reset["id"],))
        conn.commit()
    
    return {"message": "Пароль успешно изменён"}
