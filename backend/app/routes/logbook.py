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
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Получить записи логбука с поиском (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM logbook WHERE is_deleted = 0"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        if search and search.strip():
            search_term = f"%{search}%"
            query += """ AND (
                task LIKE ? OR 
                room_number LIKE ? OR 
                assignee LIKE ? OR 
                author_name LIKE ? OR 
                comment LIKE ?
            )"""
            params.extend([search_term] * 5)
        
        query += " ORDER BY is_important DESC, created_at DESC"
        
        cursor.execute(query, params)
        entries = cursor.fetchall()

    return [dict(e) for e in entries]


@router.get("/my")
async def get_my_entries(user: dict = Depends(get_current_user)):
    """Получить только свои записи (доступно всем)"""
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
    """Получить важные задачи (доступно всем)"""
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
    entry: LogEntryCreate, 
    user: dict = Depends(get_current_user)
):
    """Создать новую запись в логбуке (доступно всем)"""
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
    entry_id: int, 
    entry_update: LogEntryUpdate, 
    user: dict = Depends(get_current_user)
):
    """Обновить запись (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, is_deleted FROM logbook WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")
        
        if entry["is_deleted"]:
            raise HTTPException(400, "Нельзя редактировать удалённую запись")

        if entry["status"] == "completed":
            raise HTTPException(400, "Нельзя редактировать выполненную задачу")

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
        if entry_update.is_important is not None:
            updates.append("is_important = ?")
            values.append(entry_update.is_important)
        if entry_update.status is not None:
            updates.append("status = ?")
            values.append(entry_update.status)
            if entry_update.status == "completed":
                updates.append("completed_at = CURRENT_TIMESTAMP")

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            values.append(entry_id)
            cursor.execute(
                f"UPDATE logbook SET {', '.join(updates)} WHERE id = ?", 
                values
            )
        
        # Принудительно обновляем comment отдельным запросом (даже если он None)
        # Это гарантирует, что поле comment очистится при отправке null или пустой строки
        comment_value = None if entry_update.comment == '' or entry_update.comment is None else entry_update.comment
        cursor.execute(
            "UPDATE logbook SET comment = ? WHERE id = ?",
            (comment_value, entry_id)
        )

    return {"message": "Запись обновлена"}

@router.delete("/{entry_id}")
async def delete_log_entry(entry_id: int, user: dict = Depends(get_current_user)):
    """Переместить запись в архив (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, is_deleted FROM logbook WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")
        
        if entry["is_deleted"]:
            raise HTTPException(400, "Запись уже в архиве")

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
    """Отметить задачу как выполненную или вернуть в работу (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, is_deleted FROM logbook WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")
        
        if entry["is_deleted"]:
            raise HTTPException(400, "Нельзя изменять статус удалённой записи")

        # Переключаем статус
        if entry["status"] == "completed":
            new_status = "pending"
            completed_at = "NULL"
            message = "Задача возвращена в работу"
        else:
            new_status = "completed"
            completed_at = "CURRENT_TIMESTAMP"
            message = "Задача выполнена"
        
        cursor.execute(
            f"UPDATE logbook SET status = ?, completed_at = {completed_at} WHERE id = ?",
            (new_status, entry_id)
        )

    return {"message": message, "status": new_status}


@router.post("/{entry_id}/important")
async def toggle_important(entry_id: int, user: dict = Depends(get_current_user)):
    """Переключить важность задачи (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status, is_deleted FROM logbook WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()

        if not entry:
            raise HTTPException(404, "Запись не найдена")
        
        if entry["is_deleted"]:
            raise HTTPException(400, "Нельзя менять важность удалённой записи")

        if entry["status"] == "completed":
            raise HTTPException(400, "Нельзя менять важность выполненной задачи")

        # Получаем текущее значение is_important
        cursor.execute("SELECT is_important FROM logbook WHERE id = ?", (entry_id,))
        current = cursor.fetchone()
        new_value = 0 if current["is_important"] else 1
        
        cursor.execute(
            "UPDATE logbook SET is_important = ? WHERE id = ?", 
            (new_value, entry_id)
        )

    return {"is_important": new_value, "message": "Статус важности обновлён"}


@router.get("/history")
async def get_deleted_entries(
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Получить архивные (удалённые) записи с поиском (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM logbook WHERE is_deleted = 1"
        params = []
        
        if search and search.strip():
            search_term = f"%{search}%"
            query += """ AND (
                task LIKE ? OR 
                room_number LIKE ? OR 
                assignee LIKE ? OR 
                author_name LIKE ? OR 
                comment LIKE ?
            )"""
            params.extend([search_term] * 5)
        
        query += " ORDER BY deleted_at DESC"
        
        cursor.execute(query, params)
        entries = cursor.fetchall()

    return [dict(e) for e in entries]


@router.post("/{entry_id}/restore")
async def restore_log_entry(entry_id: int, user: dict = Depends(get_current_user)):
    """Восстановить запись из архива (доступно всем)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Проверяем, что запись существует и удалена
        cursor.execute("SELECT is_deleted FROM logbook WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()
        
        if not entry:
            raise HTTPException(404, "Запись не найдена")
        
        if not entry["is_deleted"]:
            raise HTTPException(400, "Запись не находится в архиве")
        
        # Восстанавливаем
        cursor.execute(
            """
            UPDATE logbook 
            SET is_deleted = 0, deleted_at = NULL 
            WHERE id = ?
        """,
            (entry_id,),
        )

    return {"message": "Запись восстановлена"}
