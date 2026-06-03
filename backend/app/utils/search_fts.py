import sqlite3
import os
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "data.db",
)


def init_fts():
    """Создаёт виртуальную таблицу FTS5 для морфологического поиска"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Проверяем, есть ли таблица sections
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sections'"
    )
    if not cursor.fetchone():
        logger.warning("Таблица sections не найдена, пропускаем инициализацию FTS")
        conn.close()
        return

    # Создаём виртуальную таблицу для поиска
    cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts 
        USING fts5(
            title, 
            content,
            tokenize = 'unicode61 remove_diacritics 1'
        )
    """)

    # Заполняем данными из sections
    cursor.execute("SELECT id, title, content FROM sections")
    rows = cursor.fetchall()

    # Очищаем старые данные
    cursor.execute("DELETE FROM sections_fts")

    # Вставляем новые
    for section_id, title, content in rows:
        cursor.execute(
            """
            INSERT INTO sections_fts(rowid, title, content) 
            VALUES(?, ?, ?)
        """,
            (section_id, title, content),
        )

    conn.commit()
    conn.close()
    logger.info(f"FTS5 инициализирован: {len(rows)} разделов проиндексировано")


def search_sections_fts(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Поиск с использованием FTS5"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    sql = """
        SELECT 
            s.id,
            s.title,
            s.content,
            s.photo_id,
            s.photo_id2,
            s.photo_id3,
            s.photo_id4,
            s.photo_id5,
            s.photo_id6,
            s.photo_id7
        FROM sections_fts
        JOIN sections s ON sections_fts.rowid = s.id
        WHERE sections_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    """

    try:
        cursor.execute(sql, (query, limit))
        return [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError as e:
        logger.error(f"Ошибка поиска FTS: {e}")
        return []
    finally:
        conn.close()


def simple_search(keyword: str) -> List[Dict[str, Any]]:
    """Упрощённый поиск через LIKE (резервный вариант)"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    keyword_like = f"%{keyword}%"
    cursor.execute(
        """
        SELECT id, title, content, photo_id, photo_id2, photo_id3, photo_id4, photo_id5, photo_id6, photo_id7
        FROM sections
        WHERE title LIKE ? OR content LIKE ?
        LIMIT 20
    """,
        (keyword_like, keyword_like),
    )

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def hybrid_search(query: str) -> List[Dict[str, Any]]:
    """Гибридный поиск: сначала FTS5, если пусто — LIKE"""
    query = query.strip()
    if len(query) < 2:
        return []

    results = search_sections_fts(query)

    if not results:
        results = simple_search(query)

    return results
