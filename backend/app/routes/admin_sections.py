from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
from datetime import datetime

from app.auth import get_current_admin
from app.database import get_db_connection

router = APIRouter()

ASSETS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "assets",
)
os.makedirs(ASSETS_DIR, exist_ok=True)


# Модель для обновления через JSON
class SectionUpdate(BaseModel):
    title: str
    content: str


class SectionReorder(BaseModel):
    section_ids: List[int]


@router.get("/sections")
async def get_all_sections(admin: dict = Depends(get_current_admin)):
    """Получить все разделы для админки"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, content FROM sections ORDER BY order_num ASC, id ASC"
        )
        sections = cursor.fetchall()
    return [dict(s) for s in sections]


@router.get("/sections/{section_id}")
async def get_section_admin(section_id: int, admin: dict = Depends(get_current_admin)):
    """Получить раздел для редактирования"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sections WHERE id = ?", (section_id,))
        section = cursor.fetchone()

    if not section:
        raise HTTPException(404, "Раздел не найден")

    return dict(section)


@router.post("/sections")
async def create_section_admin(
    title: str = Form(...),
    content: str = Form(...),
    photos: List[UploadFile] = File(default=[]),
    admin: dict = Depends(get_current_admin),
):
    """Создать новый раздел"""
    photo_names = []
    for i, photo in enumerate(photos[:7]):
        ext = os.path.splitext(photo.filename)[1]
        new_filename = f"section_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}{ext}"
        file_path = os.path.join(ASSETS_DIR, new_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        photo_names.append(new_filename)

    # Получаем максимальный order_num для нового раздела
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COALESCE(MAX(order_num), 0) + 1 as next_order FROM sections"
        )
        next_order = cursor.fetchone()["next_order"]

    with get_db_connection() as conn:
        cursor = conn.cursor()

        if len(photo_names) == 0:
            cursor.execute(
                "INSERT INTO sections (title, content, order_num) VALUES (?, ?, ?)",
                (title, content, next_order),
            )
        elif len(photo_names) == 1:
            cursor.execute(
                "INSERT INTO sections (title, content, photo_id, order_num) VALUES (?, ?, ?, ?)",
                (title, content, photo_names[0], next_order),
            )
        elif len(photo_names) == 2:
            cursor.execute(
                "INSERT INTO sections (title, content, photo_id, photo_id2, order_num) VALUES (?, ?, ?, ?, ?)",
                (title, content, photo_names[0], photo_names[1], next_order),
            )
        else:
            cursor.execute(
                f"""
                INSERT INTO sections (title, content, photo_id, photo_id2, photo_id3, photo_id4, photo_id5, photo_id6, photo_id7, order_num)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                [title, content]
                + photo_names
                + [None] * (7 - len(photo_names))
                + [next_order],
            )

        section_id = cursor.lastrowid

    return {"id": section_id, "title": title, "message": "Раздел создан"}


@router.put("/sections/{section_id}")
async def update_section_admin(
    section_id: int, section: SectionUpdate, admin: dict = Depends(get_current_admin)
):
    """Обновить раздел (через JSON)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sections SET title = ?, content = ? WHERE id = ?",
            (section.title, section.content, section_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(404, "Раздел не найден")

    return {"message": "Раздел обновлён"}


@router.post("/sections/reorder")
async def reorder_sections(
    reorder: SectionReorder, admin: dict = Depends(get_current_admin)
):
    """Изменить порядок разделов"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for index, section_id in enumerate(reorder.section_ids):
            cursor.execute(
                "UPDATE sections SET order_num = ? WHERE id = ?",
                (index + 1, section_id),
            )

    return {"message": "Порядок разделов обновлён"}


@router.post("/sections/{section_id}/photos")
async def add_photos_to_section(
    section_id: int,
    photos: List[UploadFile] = File(...),
    admin: dict = Depends(get_current_admin),
):
    """Добавить фото к существующему разделу"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT photo_id, photo_id2, photo_id3, photo_id4, photo_id5, photo_id6, photo_id7 FROM sections WHERE id = ?",
            (section_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Раздел не найден")

        existing_photos = [p for p in row if p]
        free_slots = 7 - len(existing_photos)

        if free_slots == 0:
            raise HTTPException(400, "Максимум 7 фото уже загружено")

        photo_names = []
        for i, photo in enumerate(photos[:free_slots]):
            ext = os.path.splitext(photo.filename)[1]
            new_filename = f"section_{section_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}{ext}"
            file_path = os.path.join(ASSETS_DIR, new_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(photo.file, buffer)
            photo_names.append(new_filename)

        update_fields = []
        update_values = []
        photo_index = len(existing_photos)

        for i, photo_name in enumerate(photo_names):
            field = (
                "photo_id" if photo_index + i == 0 else f"photo_id{photo_index + i + 1}"
            )
            update_fields.append(f"{field} = ?")
            update_values.append(photo_name)

        update_values.append(section_id)
        cursor.execute(
            f"UPDATE sections SET {', '.join(update_fields)} WHERE id = ?",
            update_values,
        )

    return {"message": f"Добавлено {len(photo_names)} фото", "photos": photo_names}


@router.delete("/sections/{section_id}/photos/{slot}")
async def delete_photo_from_section(
    section_id: int, slot: int, admin: dict = Depends(get_current_admin)
):
    """Удалить фото из раздела по номеру слота (1-7)"""
    if slot < 1 or slot > 7:
        raise HTTPException(400, "Номер слота должен быть от 1 до 7")

    field = "photo_id" if slot == 1 else f"photo_id{slot}"

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(f"SELECT {field} FROM sections WHERE id = ?", (section_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Раздел не найден")

        photo_name = row[0]
        if not photo_name:
            raise HTTPException(404, "Фото не найдено")

        photo_path = os.path.join(ASSETS_DIR, photo_name)
        if os.path.exists(photo_path):
            os.remove(photo_path)

        cursor.execute(
            f"UPDATE sections SET {field} = NULL WHERE id = ?", (section_id,)
        )

    return {"message": "Фото удалено"}


@router.delete("/sections/{section_id}")
async def delete_section_admin(
    section_id: int, admin: dict = Depends(get_current_admin)
):
    """Удалить раздел"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT photo_id, photo_id2, photo_id3, photo_id4, photo_id5, photo_id6, photo_id7 FROM sections WHERE id = ?",
            (section_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(404, "Раздел не найден")

        for photo in row:
            if photo:
                photo_path = os.path.join(ASSETS_DIR, photo)
                if os.path.exists(photo_path):
                    os.remove(photo_path)

        cursor.execute("DELETE FROM sections WHERE id = ?", (section_id,))

    return {"message": "Раздел удалён"}
