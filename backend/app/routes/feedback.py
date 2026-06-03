from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


class FeedbackCreate(BaseModel):
    subject: str
    message: str
    type: str = "bug"


@router.post("/feedback")
async def create_feedback(
    feedback: FeedbackCreate, user: dict = Depends(get_current_user)
):
    """Отправить обратную связь (упрощённая версия, без email)"""
    print(f"📝 Фидбэк от {user['email']}: {feedback.subject}")
    return {"message": "Спасибо за обратную связь!", "id": 0}


@router.get("/admin/feedback")
async def get_all_feedback(admin: dict = Depends(get_current_user)):
    """Получить все сообщения (только админ)"""
    if admin["role"] != "admin":
        raise HTTPException(403, "Доступ запрещён")
    return []


@router.put("/admin/feedback/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: int, status: str, admin: dict = Depends(get_current_user)
):
    if admin["role"] != "admin":
        raise HTTPException(403, "Доступ запрещён")
    return {"message": "Статус обновлён"}
