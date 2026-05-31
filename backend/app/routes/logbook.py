from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


class LogEntryCreate(BaseModel):
    room_number: Optional[str] = None
    task: str
    assignee: Optional[str] = None
    comment: Optional[str] = None
    is_important: bool = False


class LogEntryUpdate(BaseModel):
    room_number: Optional[str] = None
    task: Optional[str] = None
    assignee: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[str] = None
    is_important: Optional[bool] = None


class LogEntryResponse(BaseModel):
    id: int
    room_number: Optional[str]
    task: str
    assignee: Optional[str]
    author_id: int
    author_name: str
    comment: Optional[str]
    status: str
    is_important: bool
    created_at: str
    updated_at: str
    completed_at: Optional[str]


@router.get("/")
async def get_logbook_entries(
    status: Optional[str] = None, user: dict = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        if status:
            cursor.execute(
                "SELECT * FROM logbook WHERE status = ? AND is_deleted = 0 ORDER BY created_at DESC",
                (status,),
            )
        else:
            cursor.execute(
                "SELECT * FROM logbook WHERE is_deleted = 0 ORDER BY created_at DESC"
            )

        entries = cursor.fetchall()

    return [dict(e) for e in entries]


@router.get("/my")
async def get_my_entries(user: dict = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM logbook WHERE author_id = ? AND is_deleted = 0 ORDER BY created_at DESC",
            (user["id"],),
        )
        entries = cursor.fetchall()

    return [dict(e) for e in entries]


@router.get("/important")
async def get_important_entries(user: dict = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM logbook 
            WHERE is_important = 1 AND status != 'completed' AND is_deleted = 0
            ORDER BY created_at DESC
        """)
        entries = cursor.fetchall()

    return [dict(e) for e in entries]


@router.post("/", response_model=LogEntryResponse)
async def create_log_entry(
    entry: LogEntryCreate, user: dict = Depends(get_current_user)
):
    """Создать новую запись в логбуке"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO logbook (room_number, task, assignee, author_id, author_name, comment, status, is_important)
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        """,
            (
                entry.room_number,
                entry.task,
                entry.assignee,
                user["id"],
                user["full_name"],
                entry.comment,
                entry.is_important,
            ),
        )

        entry_id = cursor.lastrowid
        cursor.execute("SELECT * FROM logbook WHERE id = ?", (entry_id,))
        new_entry = cursor.fetchone()

    return dict(new_entry)


@router.put("/{entry_id}")
async def update_log_entry(
    entry_id: int, entry_update: LogEntryUpdate, user: dict = Depends(get_current_user)
):
    """Обновить запись (только автор или админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT author_id, status FROM logbook WHERE id = ?", (entry_id,)
        )
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")

        # Нельзя редактировать выполненные задачи
        if entry["status"] == "completed":
            raise HTTPException(400, "Нельзя редактировать выполненную задачу")

        if entry["author_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Нет прав на редактирование")

        updates = []
        values = []

        if entry_update.room_number is not None:
            updates.append("room_number = ?")
            values.append(entry_update.room_number)
        if entry_update.task is not None:
            updates.append("task = ?")
            values.append(entry_update.task)
        if entry_update.assignee is not None:
            updates.append("assignee = ?")
            values.append(entry_update.assignee)
        if entry_update.comment is not None:
            updates.append("comment = ?")
            values.append(entry_update.comment)
        if entry_update.status is not None:
            updates.append("status = ?")
            values.append(entry_update.status)
            if entry_update.status == "completed":
                updates.append("completed_at = CURRENT_TIMESTAMP")
        if entry_update.is_important is not None:
            updates.append("is_important = ?")
            values.append(entry_update.is_important)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(entry_id)
            cursor.execute(
                f"UPDATE logbook SET {', '.join(updates)} WHERE id = ?", values
            )

    return {"message": "Запись обновлена"}


@router.delete("/{entry_id}")
async def delete_log_entry(entry_id: int, user: dict = Depends(get_current_user)):
    """Переместить запись в архив (только автор или админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT author_id FROM logbook WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")

        if entry["author_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Нет прав на удаление")

        # Помечаем как удалённое
        cursor.execute(
            """
            UPDATE logbook 
            SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """,
            (entry_id,),
        )

    return {"message": "Запись перемещена в архив"}


@router.post("/{entry_id}/complete")
async def complete_task(entry_id: int, user: dict = Depends(get_current_user)):
    """Отметить задачу как выполненную (только исполнитель или админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT assignee, author_id, status FROM logbook WHERE id = ?", (entry_id,)
        )
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")

        if entry["status"] == "completed":
            raise HTTPException(400, "Задача уже выполнена")

        # Проверяем, что пользователь исполнитель, автор или админ
        can_complete = (
            entry["assignee"] == user["full_name"]
            or entry["author_id"] == user["id"]
            or user["role"] == "admin"
        )

        if not can_complete:
            raise HTTPException(
                403, "Только исполнитель, автор или админ может отметить задачу"
            )

        cursor.execute(
            """
            UPDATE logbook 
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """,
            (entry_id,),
        )

    return {"message": "Задача отмечена как выполненная"}


@router.post("/{entry_id}/important")
async def toggle_important(entry_id: int, user: dict = Depends(get_current_user)):
    """Переключить важность задачи (только админ или автор)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT author_id, is_important, status FROM logbook WHERE id = ?",
            (entry_id,),
        )
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")

        if entry["status"] == "completed":
            raise HTTPException(400, "Нельзя менять важность выполненной задачи")

        if entry["author_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Нет прав")

        new_value = 0 if entry["is_important"] else 1
        cursor.execute(
            "UPDATE logbook SET is_important = ? WHERE id = ?", (new_value, entry_id)
        )

    return {"is_important": new_value, "message": "Статус важности обновлён"}


@router.get("/history")
async def get_deleted_entries(user: dict = Depends(get_current_user)):
    """Получить архивные (удалённые) записи"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM logbook 
            WHERE is_deleted = 1 
            ORDER BY deleted_at DESC
        """)
        entries = cursor.fetchall()

    return [dict(e) for e in entries]


@router.post("/{entry_id}/restore")
async def restore_log_entry(entry_id: int, user: dict = Depends(get_current_user)):
    """Восстановить запись из архива (только админ)"""
    if user["role"] != "admin":
        raise HTTPException(403, "Доступ запрещён")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE logbook 
            SET is_deleted = 0, deleted_at = NULL 
            WHERE id = ?
        """,
            (entry_id,),
        )

    return {"message": "Запись восстановлена"}
