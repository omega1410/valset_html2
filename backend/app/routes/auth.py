from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.auth import get_current_user, get_current_admin
from app.database import get_db_connection

router = APIRouter()
logger = logging.getLogger(__name__)


class FeedbackCreate(BaseModel):
    subject: str
    message: str
    type: str = "bug"


@router.post("/feedback")
async def create_feedback(
    feedback: FeedbackCreate, user: dict = Depends(get_current_user)
):
    """Отправить обратную связь"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
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
        return {"message": "Спасибо за обратную связь!", "id": feedback_id}
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(500, "Internal error")


@router.get("/admin/feedback")
async def get_all_feedback(admin: dict = Depends(get_current_admin)):
    """Получить все сообщения"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM feedback ORDER BY created_at DESC")
        rows = cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/admin/feedback/stats/summary")
async def get_feedback_stats(admin: dict = Depends(get_current_admin)):
    """Получить статистику"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM feedback")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as new FROM feedback WHERE status = 'new'")
        new_count = cursor.fetchone()["new"]

        cursor.execute(
            "SELECT COUNT(*) as completed FROM feedback WHERE status = 'completed'"
        )
        completed_count = cursor.fetchone()["completed"]

        cursor.execute("SELECT COUNT(*) as bugs FROM feedback WHERE type = 'bug'")
        bugs_count = cursor.fetchone()["bugs"]

        cursor.execute(
            "SELECT COUNT(*) as features FROM feedback WHERE type = 'feature'"
        )
        features_count = cursor.fetchone()["features"]

    return {
        "total": total or 0,
        "by_status": {"new": new_count or 0, "completed": completed_count or 0},
        "by_type": {"bug": bugs_count or 0, "feature": features_count or 0},
    }
