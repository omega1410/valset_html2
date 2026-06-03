from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


class SubmitTestRequest(BaseModel):
    answers: List[int]


@router.get("/list")
async def get_tests(user: dict = Depends(get_current_user)):
    """Получить список всех тестов"""
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

    tests_list = []
    for test in tests:
        # Отдельное соединение для статистики
        with get_db_connection() as conn2:
            cursor2 = conn2.cursor()
            cursor2.execute(
                """
                SELECT correct_answers, total_questions 
                FROM test_stats 
                WHERE user_id = ? AND section_id = ?
            """,
                (user["id"], test["id"]),
            )
            stats = cursor2.fetchone()

        tests_list.append(
            {
                "id": test["id"],
                "title": test["title"],
                "description": test["description"],
                "section_id": test["section_id"],
                "questions_count": test["questions_count"],
                "completed": stats is not None,
                "result": (
                    {
                        "correct_answers": stats["correct_answers"],
                        "total_questions": stats["total_questions"],
                    }
                    if stats
                    else None
                ),
            }
        )

    return tests_list


@router.get("/{test_id}")
async def get_test(test_id: int, user: dict = Depends(get_current_user)):
    """Получить тест по ID"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM tests WHERE id = ?", (test_id,))
        test = cursor.fetchone()

        if not test:
            raise HTTPException(404, "Тест не найден")

        cursor.execute(
            """
            SELECT id, question, option1, option2, option3, correct_index, order_num
            FROM test_questions 
            WHERE test_id = ? 
            ORDER BY order_num
        """,
            (test_id,),
        )
        rows = cursor.fetchall()

    questions = []
    for row in rows:
        questions.append(
            {
                "id": row["id"],
                "question": row["question"],
                "options": [row["option1"], row["option2"], row["option3"]],
                "correct_index": row["correct_index"],
            }
        )

    return {
        "id": test["id"],
        "title": test["title"],
        "description": test["description"],
        "section_id": test["section_id"],
        "questions": questions,
        "total_questions": len(questions),
    }


@router.post("/{test_id}/submit")
async def submit_test(
    test_id: int, request: SubmitTestRequest, user: dict = Depends(get_current_user)
):
    """Отправить результаты теста"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT correct_index 
            FROM test_questions 
            WHERE test_id = ? 
            ORDER BY order_num
        """,
            (test_id,),
        )
        questions = cursor.fetchall()

    if not questions:
        raise HTTPException(404, "Тест не найден")

    if len(request.answers) != len(questions):
        raise HTTPException(400, "Количество ответов не совпадает")

    correct = 0
    for i, answer in enumerate(request.answers):
        if answer == questions[i]["correct_index"]:
            correct += 1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO test_stats (user_id, section_id, correct_answers, total_questions)
            VALUES (?, ?, ?, ?)
        """,
            (user["id"], test_id, correct, len(questions)),
        )

    return {
        "correct": correct,
        "total": len(questions),
        "percentage": round(correct / len(questions) * 100),
        "passed": correct / len(questions) >= 0.7,
    }
