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


class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    comment: Optional[str] = None


@router.post("/feedback")
async def create_feedback(
    feedback: FeedbackCreate, user: dict = Depends(get_current_user)
):
    """Отправить обратную связь"""
    try:
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
                    admin_comment TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

        logger.info(f"Feedback #{feedback_id} created by {user['email']}")
        return {
            "message": "Спасибо за обратную связь!",
            "id": feedback_id,
            "status": "new",
        }
    except Exception as e:
        logger.error(f"Error creating feedback: {e}")
        raise HTTPException(500, "Внутренняя ошибка сервера")


@router.get("/admin/feedback")
async def get_all_feedback(admin: dict = Depends(get_current_admin)):
    """Получить все сообщения (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT f.*, u.email as user_email
            FROM feedback f
            JOIN users u ON f.user_id = u.id
            ORDER BY 
                CASE f.status 
                    WHEN 'new' THEN 1 
                    WHEN 'in_progress' THEN 2 
                    ELSE 3 
                END,
                f.created_at DESC
        """)
        feedback = cursor.fetchall()
    return [dict(f) for f in feedback]


@router.get("/admin/feedback/{feedback_id}")
async def get_feedback_detail(
    feedback_id: int, admin: dict = Depends(get_current_admin)
):
    """Получить детали сообщения"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT f.*, u.email as user_email
            FROM feedback f
            JOIN users u ON f.user_id = u.id
            WHERE f.id = ?
        """,
            (feedback_id,),
        )
        feedback = cursor.fetchone()
        if not feedback:
            raise HTTPException(404, "Сообщение не найдено")
    return dict(feedback)


@router.put("/admin/feedback/{feedback_id}")
async def update_feedback(
    feedback_id: int, update: FeedbackUpdate, admin: dict = Depends(get_current_admin)
):
    """Обновить статус или комментарий сообщения"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        if update.status is not None:
            cursor.execute(
                "UPDATE feedback SET status = ? WHERE id = ?",
                (update.status, feedback_id),
            )

        if update.comment is not None:
            cursor.execute(
                "UPDATE feedback SET admin_comment = ? WHERE id = ?",
                (update.comment, feedback_id),
            )

        if cursor.rowcount == 0:
            raise HTTPException(404, "Сообщение не найдено")

        conn.commit()

    return {"message": "Сообщение обновлено"}


@router.delete("/admin/feedback/{feedback_id}")
async def delete_feedback(feedback_id: int, admin: dict = Depends(get_current_admin)):
    """Удалить сообщение (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))

        if cursor.rowcount == 0:
            raise HTTPException(404, "Сообщение не найдено")

    logger.info(f"Feedback #{feedback_id} deleted by {admin['email']}")
    return {"message": "Сообщение удалено"}


@router.get("/admin/feedback/stats/summary")
async def get_feedback_stats(admin: dict = Depends(get_current_admin)):
    """Получить статистику по фидбэку"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as total FROM feedback")
        total = cursor.fetchone()["total"] or 0

        cursor.execute("SELECT COUNT(*) as new FROM feedback WHERE status = 'new'")
        new_count = cursor.fetchone()["new"] or 0

        cursor.execute(
            "SELECT COUNT(*) as in_progress FROM feedback WHERE status = 'in_progress'"
        )
        in_progress_count = cursor.fetchone()["in_progress"] or 0

        cursor.execute(
            "SELECT COUNT(*) as completed FROM feedback WHERE status = 'completed'"
        )
        completed_count = cursor.fetchone()["completed"] or 0

        cursor.execute("SELECT COUNT(*) as bugs FROM feedback WHERE type = 'bug'")
        bugs_count = cursor.fetchone()["bugs"] or 0

        cursor.execute(
            "SELECT COUNT(*) as features FROM feedback WHERE type = 'feature'"
        )
        features_count = cursor.fetchone()["features"] or 0

        cursor.execute(
            "SELECT COUNT(*) as questions FROM feedback WHERE type = 'question'"
        )
        questions_count = cursor.fetchone()["questions"] or 0

    return {
        "total": total,
        "by_status": {
            "new": new_count,
            "in_progress": in_progress_count,
            "completed": completed_count,
        },
        "by_type": {
            "bug": bugs_count,
            "feature": features_count,
            "question": questions_count,
        },
    }
