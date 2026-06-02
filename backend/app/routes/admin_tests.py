from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.auth import get_current_admin
from app.database import get_db_connection

router = APIRouter()


class TestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    section_id: Optional[int] = None


class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    section_id: Optional[int] = None


class QuestionCreate(BaseModel):
    test_id: int
    question: str
    option1: str
    option2: str
    option3: str
    correct_index: int
    order_num: int = 0


class QuestionUpdate(BaseModel):
    question: str
    option1: str
    option2: str
    option3: str
    correct_index: int
    order_num: int = 0


# ============ УПРАВЛЕНИЕ ТЕСТАМИ ============


@router.get("/tests")
async def get_all_tests(admin: dict = Depends(get_current_admin)):
    """Получить все тесты"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.*, COUNT(q.id) as questions_count
            FROM tests t
            LEFT JOIN test_questions q ON t.id = q.test_id
            GROUP BY t.id
            ORDER BY t.id
        """)
        tests = cursor.fetchall()
    return [dict(t) for t in tests]


@router.get("/tests/{test_id}")
async def get_test_admin(test_id: int, admin: dict = Depends(get_current_admin)):
    """Получить тест для редактирования"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tests WHERE id = ?", (test_id,))
        test = cursor.fetchone()

        if not test:
            raise HTTPException(404, "Тест не найден")

        cursor.execute(
            """
            SELECT * FROM test_questions WHERE test_id = ? ORDER BY order_num
        """,
            (test_id,),
        )
        questions = cursor.fetchall()

    return {
        "id": test["id"],
        "title": test["title"],
        "description": test["description"],
        "section_id": test["section_id"],
        "questions": [dict(q) for q in questions],
    }


@router.post("/tests")
async def create_test(test: TestCreate, admin: dict = Depends(get_current_admin)):
    """Создать новый тест"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tests (title, description, section_id)
            VALUES (?, ?, ?)
        """,
            (test.title, test.description, test.section_id),
        )
        test_id = cursor.lastrowid

    return {"id": test_id, "title": test.title, "message": "Тест создан"}


@router.put("/tests/{test_id}")
async def update_test(
    test_id: int, test: TestUpdate, admin: dict = Depends(get_current_admin)
):
    """Обновить тест"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        updates = []
        values = []

        if test.title is not None:
            updates.append("title = ?")
            values.append(test.title)
        if test.description is not None:
            updates.append("description = ?")
            values.append(test.description)
        if test.section_id is not None:
            updates.append("section_id = ?")
            values.append(test.section_id)

        if not updates:
            raise HTTPException(400, "Нет данных для обновления")

        values.append(test_id)
        cursor.execute(f"UPDATE tests SET {', '.join(updates)} WHERE id = ?", values)

    return {"message": "Тест обновлён"}


@router.delete("/tests/{test_id}")
async def delete_test(test_id: int, admin: dict = Depends(get_current_admin)):
    """Удалить тест (и все связанные вопросы)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tests WHERE id = ?", (test_id,))

    return {"message": "Тест удалён"}


# ============ УПРАВЛЕНИЕ ВОПРОСАМИ ============


@router.post("/questions")
async def add_question_to_test(
    q: QuestionCreate, admin: dict = Depends(get_current_admin)
):
    """Добавить вопрос к тесту"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Получаем следующий order_num если не указан
        if q.order_num == 0:
            cursor.execute(
                "SELECT COALESCE(MAX(order_num), 0) + 1 FROM test_questions WHERE test_id = ?",
                (q.test_id,),
            )
            order_num = cursor.fetchone()[0]
        else:
            order_num = q.order_num

        # УБРАЛИ section_id из запроса!
        cursor.execute(
            """
            INSERT INTO test_questions (test_id, question, option1, option2, option3, correct_index, order_num)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                q.test_id,
                q.question,
                q.option1,
                q.option2,
                q.option3,
                q.correct_index,
                order_num,
            ),
        )
        q_id = cursor.lastrowid

        cursor.execute("SELECT * FROM test_questions WHERE id = ?", (q_id,))
        new_question = cursor.fetchone()

    return dict(new_question)


@router.put("/questions/{q_id}")
async def update_question(
    q_id: int, q: QuestionUpdate, admin: dict = Depends(get_current_admin)
):
    """Обновить вопрос"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE test_questions 
            SET question = ?, option1 = ?, option2 = ?, option3 = ?, correct_index = ?, order_num = ?
            WHERE id = ?
        """,
            (
                q.question,
                q.option1,
                q.option2,
                q.option3,
                q.correct_index,
                q.order_num,
                q_id,
            ),
        )

    return {"message": "Вопрос обновлён"}


@router.delete("/questions/{q_id}")
async def delete_question(q_id: int, admin: dict = Depends(get_current_admin)):
    """Удалить вопрос"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM test_questions WHERE id = ?", (q_id,))

    return {"message": "Вопрос удалён"}


# ============ МАССОВОЕ СОЗДАНИЕ ТЕСТА ============


class BulkQuestionItem(BaseModel):
    question: str
    option1: str
    option2: str
    option3: str
    correct_index: int


class BulkTestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    section_id: Optional[int] = None
    questions: List[BulkQuestionItem]


@router.post("/tests/bulk")
async def create_test_bulk(
    test: BulkTestCreate, admin: dict = Depends(get_current_admin)
):
    """Создать тест с несколькими вопросами сразу"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Создаём тест
        cursor.execute(
            """
            INSERT INTO tests (title, description, section_id)
            VALUES (?, ?, ?)
        """,
            (test.title, test.description, test.section_id),
        )
        test_id = cursor.lastrowid

        # Добавляем вопросы
        for i, q in enumerate(test.questions):
            cursor.execute(
                """
                INSERT INTO test_questions (test_id, question, option1, option2, option3, correct_index, order_num)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    test_id,
                    q.question,
                    q.option1,
                    q.option2,
                    q.option3,
                    q.correct_index,
                    i + 1,
                ),
            )

    return {"id": test_id, "title": test.title, "questions_count": len(test.questions)}
