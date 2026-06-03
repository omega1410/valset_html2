from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime

from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


class TaskToggle(BaseModel):
    task_id: int
    is_done: bool


@router.get("/types")
async def get_checklist_types(user: dict = Depends(get_current_user)):
    """Получить типы чек-листов"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT DISTINCT shift_type, COUNT(*) as tasks_count FROM checklist_tasks GROUP BY shift_type"
        )
        types = cursor.fetchall()

    result = []
    for t in types:
        name = "Дневная смена" if t["shift_type"] == "day" else "Ночная смена"
        result.append(
            {"type": t["shift_type"], "name": name, "tasks_count": t["tasks_count"]}
        )

    return result


@router.get("/{shift_type}")
async def get_checklist(shift_type: str, user: dict = Depends(get_current_user)):
    """Получить чек-лист для смены"""
    # Создаём таблицу прогресса пользователя если её нет
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_progress (
                user_id INTEGER,
                shift_type TEXT,
                task_id INTEGER,
                is_done BOOLEAN DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, shift_type, task_id)
            )
        """)

    # Получаем задачи для смены
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM checklist_tasks WHERE shift_type = ? ORDER BY task_order",
            (shift_type,),
        )
        tasks = cursor.fetchall()

    if not tasks:
        raise HTTPException(404, "Чек-лист не найден")

    # Получаем прогресс пользователя
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT task_id, is_done FROM checklist_progress WHERE user_id = ? AND shift_type = ?",
            (user["id"], shift_type),
        )
        progress = {row["task_id"]: row["is_done"] for row in cursor.fetchall()}

    # Формируем список задач с их статусом
    tasks_with_status = []
    for task in tasks:
        tasks_with_status.append(
            {
                "id": task["id"],
                "text": task["task_text"],
                "order": task["task_order"],
                "is_done": progress.get(task["id"], False),
            }
        )

    completed = sum(1 for t in tasks_with_status if t["is_done"])
    total = len(tasks_with_status)

    return {
        "shift_type": shift_type,
        "name": "Дневная смена" if shift_type == "day" else "Ночная смена",
        "tasks": tasks_with_status,
        "completed": completed,
        "total": total,
        "percentage": round(completed / total * 100) if total else 0,
    }


@router.post("/{shift_type}/toggle")
async def toggle_task(
    shift_type: str, task: TaskToggle, user: dict = Depends(get_current_user)
):
    """Переключить статус задачи и проверить на полное выполнение"""

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Обновляем статус задачи
        cursor.execute(
            """
            INSERT OR REPLACE INTO checklist_progress (user_id, shift_type, task_id, is_done, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (user["id"], shift_type, task.task_id, task.is_done),
        )

        # 2. ОДНИМ ЗАПРОСОМ проверяем, все ли задачи выполнены
        cursor.execute(
            """
            SELECT 
                (SELECT COUNT(*) FROM checklist_tasks WHERE shift_type = ?) as total,
                (SELECT COUNT(*) FROM checklist_progress 
                 WHERE user_id = ? AND shift_type = ? AND is_done = 1) as completed
            """,
            (shift_type, user["id"], shift_type),
        )
        stats = cursor.fetchone()

        total = stats["total"] if stats else 0
        completed = stats["completed"] if stats else 0
        all_completed = completed == total and total > 0

        # 3. Если все выполнены - сбрасываем и начисляем очко
        if all_completed:
            # Сбрасываем прогресс
            cursor.execute(
                "DELETE FROM checklist_progress WHERE user_id = ? AND shift_type = ?",
                (user["id"], shift_type),
            )

            # Начисляем очко в статистику
            cursor.execute(
                """
                INSERT INTO test_stats (user_id, section_id, correct_answers, total_questions)
                VALUES (?, 0, 1, 1)
                ON CONFLICT(user_id, section_id) DO UPDATE SET
                    correct_answers = correct_answers + 1,
                    total_questions = total_questions + 1
                """,
                (user["id"],),
            )

            return {
                "message": "Все задачи выполнены! Чек-лист сброшен.",
                "reset": True,
                "completed_checklist_added": True,
            }

    return {"message": "Статус обновлён", "reset": False}


@router.post("/{shift_type}/reset")
async def reset_checklist(shift_type: str, user: dict = Depends(get_current_user)):
    """Сбросить все задачи чек-листа"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM checklist_progress WHERE user_id = ? AND shift_type = ?",
            (user["id"], shift_type),
        )

    return {"message": "Чек-лист сброшен"}
