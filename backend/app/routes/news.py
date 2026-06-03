from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.auth import get_current_user, get_current_admin
from app.database import get_db_connection

router = APIRouter()


class NewsCreate(BaseModel):
    title: str
    content: str


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None


@router.get("/")
async def get_news(limit: int = 10, user: dict = Depends(get_current_user)):
    """Получить последние новости (для всех пользователей)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM news 
            WHERE is_published = 1 
            ORDER BY created_at DESC 
            LIMIT ?
        """,
            (limit,),
        )
        news = cursor.fetchall()
    return [dict(n) for n in news]


@router.get("/all")
async def get_all_news(admin: dict = Depends(get_current_admin)):
    """Получить все новости (для админов)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM news ORDER BY created_at DESC")
        news = cursor.fetchall()
    return [dict(n) for n in news]


@router.post("/")
async def create_news(news: NewsCreate, admin: dict = Depends(get_current_admin)):
    """Создать новость (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO news (title, content, author_id, author_name)
            VALUES (?, ?, ?, ?)
        """,
            (news.title, news.content, admin["id"], admin["full_name"]),
        )
        news_id = cursor.lastrowid
        cursor.execute("SELECT * FROM news WHERE id = ?", (news_id,))
        new_news = cursor.fetchone()
    return dict(new_news)


@router.put("/{news_id}")
async def update_news(
    news_id: int, news: NewsUpdate, admin: dict = Depends(get_current_admin)
):
    """Обновить новость (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        updates = []
        values = []

        if news.title is not None:
            updates.append("title = ?")
            values.append(news.title)
        if news.content is not None:
            updates.append("content = ?")
            values.append(news.content)
        if news.is_published is not None:
            updates.append("is_published = ?")
            values.append(news.is_published)

        if not updates:
            raise HTTPException(400, "Нет данных для обновления")

        values.append(news_id)
        cursor.execute(f"UPDATE news SET {', '.join(updates)} WHERE id = ?", values)

    return {"message": "Новость обновлена"}


@router.delete("/{news_id}")
async def delete_news(news_id: int, admin: dict = Depends(get_current_admin)):
    """Удалить новость (только админ)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM news WHERE id = ?", (news_id,))

    return {"message": "Новость удалена"}
