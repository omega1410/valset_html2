from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
import sqlite3
import os

from app.database import get_db_connection
from app.utils.search_fts import hybrid_search
from app.auth import get_current_user

router = APIRouter()


class SectionOut(BaseModel):
    id: int
    title: str
    content: str
    photo_id: Optional[str] = None
    photo_id2: Optional[str] = None
    photo_id3: Optional[str] = None
    photo_id4: Optional[str] = None
    photo_id5: Optional[str] = None
    photo_id6: Optional[str] = None
    photo_id7: Optional[str] = None


@router.get("/search")
async def search_sections(
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    user: dict = Depends(get_current_user),
) -> List[SectionOut]:
    """Поиск по разделам с морфологией"""
    results = hybrid_search(q)
    return results


@router.get("/")
async def get_sections(
    page: int = 1, limit: int = 10, user: dict = Depends(get_current_user)
) -> dict:
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM sections")
        total = cursor.fetchone()[0]

        offset = (page - 1) * limit
        cursor.execute(
            """
            SELECT id, title, content, photo_id, photo_id2, photo_id3, photo_id4, photo_id5, photo_id6, photo_id7
            FROM sections
            ORDER BY order_num ASC, id ASC
            LIMIT ? OFFSET ?
        """,
            (limit, offset),
        )

        sections = [dict(row) for row in cursor.fetchall()]

    return {
        "items": sections,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{section_id}")
async def get_section(
    section_id: int, user: dict = Depends(get_current_user)
) -> SectionOut:
    """Получить один раздел по ID"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, title, content, photo_id, photo_id2, photo_id3, photo_id4, photo_id5, photo_id6, photo_id7
            FROM sections WHERE id = ?
        """,
            (section_id,),
        )

        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Раздел не найден")

    return dict(row)
