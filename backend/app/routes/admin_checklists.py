from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.auth import get_current_admin
from app.database import get_db_connection

router = APIRouter()


class ChecklistTaskCreate(BaseModel):
    shift_type: str
    task_text: str
    task_order: int
    hint: Optional[str] = None


@router.get("/checklists/tasks")
async def get_all_tasks(admin: dict = Depends(get_current_admin)):
    """Получить все задачи чек-листов"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM checklist_tasks ORDER BY shift_type, task_order")
        tasks = cursor.fetchall()
    return [dict(t) for t in tasks]


@router.get("/checklists/tasks/{shift_type}")
async def get_tasks_by_shift(shift_type: str, admin: dict = Depends(get_current_admin)):
    """Получить задачи для конкретной смены (day/night)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM checklist_tasks WHERE shift_type = ? ORDER BY task_order",
            (shift_type,),
        )
        tasks = cursor.fetchall()
    return [dict(t) for t in tasks]


@router.post("/checklists/tasks")
async def create_task(
    task: ChecklistTaskCreate, admin: dict = Depends(get_current_admin)
):
    """Создать новую задачу"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO checklist_tasks (shift_type, task_text, task_order, hint)
            VALUES (?, ?, ?, ?)
        """,
            (task.shift_type, task.task_text, task.task_order, task.hint),
        )
        task_id = cursor.lastrowid
    return {"id": task_id, **task.dict()}


@router.put("/checklists/tasks/{task_id}")
async def update_task(
    task_id: int, task: ChecklistTaskCreate, admin: dict = Depends(get_current_admin)
):
    """Обновить задачу"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE checklist_tasks 
            SET shift_type = ?, task_text = ?, task_order = ?, hint = ?
            WHERE id = ?
        """,
            (task.shift_type, task.task_text, task.task_order, task.hint, task_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(404, "Задача не найдена")
    return {"message": "Задача обновлена"}


@router.delete("/checklists/tasks/{task_id}")
async def delete_task(task_id: int, admin: dict = Depends(get_current_admin)):
    """Удалить задачу"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM checklist_tasks WHERE id = ?", (task_id,))

        if cursor.rowcount == 0:
            raise HTTPException(404, "Задача не найдена")
    return {"message": "Задача удалена"}


@router.post("/checklists/reset-default")
async def reset_default_tasks(admin: dict = Depends(get_current_admin)):
    """Сбросить задачи до стандартных (дневная и ночная смена)"""

    default_tasks_day = [
        "Принять смену",
        "Сверить кассу",
        "Заполнить журнал",
        "Просмотреть отчет за смену",
        "Проверить заезды",
        "Сделать ключи",
        "Заполнить EMIS",
        "Заполнить Profiles",
        "Передать смену",
    ]

    default_tasks_night = [
        "Принять смену",
        "Сверить кассу",
        "Заполнить журнал",
        "Отправить отчет проживающих",
        "Позвонить гостям по уборке",
        "Проверить выезды",
        "Заполнить EMIS",
        "Заполнить Profiles",
        "Сверить кассу и закрыться",
        "Провести ночной аудит",
        "Отправить отчет No Show",
        "Отправить отчет за смену",
        "Проверить счета гостей",
        "Передать смену",
    ]

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("DELETE FROM checklist_tasks")

        for i, task in enumerate(default_tasks_day, 1):
            cursor.execute(
                """
                INSERT INTO checklist_tasks (shift_type, task_text, task_order, hint)
                VALUES ('day', ?, ?, NULL)
            """,
                (task, i),
            )

        for i, task in enumerate(default_tasks_night, 1):
            cursor.execute(
                """
                INSERT INTO checklist_tasks (shift_type, task_text, task_order, hint)
                VALUES ('night', ?, ?, NULL)
            """,
                (task, i),
            )

    return {
        "message": f"Сброшено: {len(default_tasks_day)} дневных, {len(default_tasks_night)} ночных задач"
    }
