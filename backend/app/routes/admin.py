from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel, EmailStr

from app.database import get_db_connection, hash_password
from app.auth import get_current_admin

router = APIRouter()


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
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
    """Получить всех пользователей (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, full_name, role, is_active FROM users")
        users = cursor.fetchall()

    return [dict(user) for user in users]


@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, admin: dict = Depends(get_current_admin)):
    """Создать нового пользователя (только админ)"""
    from app.routes.auth import get_user_by_email

    existing = get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")

    hashed_password = hash_password(user_data.password)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (email, full_name, password_hash, role)
            VALUES (?, ?, ?, ?)
        """,
            (user_data.email, user_data.full_name, hashed_password, user_data.role),
        )

        user_id = cursor.lastrowid
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()

    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        is_active=user["is_active"],
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, admin: dict = Depends(get_current_admin)):
    """Удалить пользователя (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ? AND role != 'admin'", (user_id,))

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404, detail="Пользователь не найден или является админом"
            )

    return {"message": "Пользователь удалён"}
