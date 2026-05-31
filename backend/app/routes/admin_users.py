from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional

from app.auth import get_current_admin
from app.database import get_db_connection, hash_password

router = APIRouter()


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: str
    role: str = "user"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool


@router.get("/users", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(get_current_admin)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, full_name, role, is_active FROM users")
        users = cursor.fetchall()
    return [dict(u) for u in users]


@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(get_current_admin)):
    existing = None
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        existing = cursor.fetchone()

    if existing:
        raise HTTPException(400, "Пользователь с таким email уже существует")

    hashed_password = hash_password(user_data.password)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (email, full_name, first_name, last_name, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                user_data.email,
                user_data.full_name,
                user_data.first_name,
                user_data.last_name,
                hashed_password,
                user_data.role,
            ),
        )

        user_id = cursor.lastrowid
        cursor.execute(
            "SELECT id, email, full_name, first_name, last_name, role, is_active FROM users WHERE id = ?",
            (user_id,),
        )
        user = cursor.fetchone()

    return dict(user)


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: dict = Depends(get_current_admin)):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id, role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Пользователь не найден")

        # Нельзя удалить самого себя
        if row["id"] == admin["id"]:
            raise HTTPException(400, "Нельзя удалить самого себя")

        # Удаляем пользователя
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))

        # Пробуем удалить статистику (если таблица существует)
        try:
            cursor.execute("DELETE FROM test_stats WHERE user_id = ?", (user_id,))
        except:
            pass

        # Пробуем удалить прогресс чек-листов (если таблица существует)
        try:
            cursor.execute(
                "DELETE FROM checklist_progress WHERE user_id = ?", (user_id,)
            )
        except:
            pass

    return {"message": "Пользователь удалён"}
