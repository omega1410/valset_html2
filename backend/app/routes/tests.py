from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import random
import json
from datetime import datetime

from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


class SubmitTestRequest(BaseModel):
    answers: List[int]
    time_spent: Optional[int] = None


class TestSession(BaseModel):
    test_id: int
    questions_order: List[int]
    questions_mapping: List[dict] = []
    started_at: datetime
    time_limit: int = 600  # лимит в секундах


# Хранилище активных сессий (в памяти)
active_sessions: Dict[int, TestSession] = {}


@router.get("/list")
async def get_tests(user: dict = Depends(get_current_user)):
    """Получить список всех тестов (без правильных ответов)"""
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
            
            cursor2.execute(
                """
                SELECT MAX(score) as best_score
                FROM test_attempts
                WHERE user_id = ? AND test_id = ?
            """,
                (user["id"], test["id"]),
            )
            best = cursor2.fetchone()
            
            cursor2.execute(
                "SELECT COUNT(*) as count FROM test_attempts WHERE user_id = ? AND test_id = ?",
                (user["id"], test["id"])
            )
            attempts_count = cursor2.fetchone()

        tests_list.append(
            {
                "id": test["id"],
                "title": test["title"],
                "description": test["description"],
                "section_id": test["section_id"],
                "questions_count": test["questions_count"],
                "time_limit": test["time_limit"] if "time_limit" in test.keys() else 600,
                "completed": stats is not None,
                "result": (
                    {
                        "correct_answers": stats["correct_answers"],
                        "total_questions": stats["total_questions"],
                        "percentage": round(stats["correct_answers"] / stats["total_questions"] * 100)
                    }
                    if stats
                    else None
                ),
                "best_score": best["best_score"] if best else None,
                "attempts_count": attempts_count["count"] if attempts_count else 0
            }
        )

    return tests_list


@router.get("/{test_id}")
async def get_test(test_id: int, user: dict = Depends(get_current_user)):
    """Получить тест (без правильных ответов, с перемешанными вопросами и вариантами)"""
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
        questions = cursor.fetchall()
    
    time_limit = test["time_limit"] if "time_limit" in test.keys() else 600
    
    # Перемешиваем вопросы
    shuffled_questions = list(questions)
    random.shuffle(shuffled_questions)
    
    questions_order = [q["id"] for q in shuffled_questions]
    
    # Для каждого вопроса сохраняем маппинг вариантов
    questions_mapping = []
    questions_response = []
    
    for q in shuffled_questions:
        # Исходные варианты
        original_options = [q["option1"], q["option2"], q["option3"]]
        correct_original_index = q["correct_index"]
        
        # Создаем пары (индекс, вариант) и перемешиваем
        indexed_options = list(enumerate(original_options))
        random.shuffle(indexed_options)
        
        # Разделяем обратно
        shuffled_indices = [idx for idx, _ in indexed_options]
        shuffled_options = [opt for _, opt in indexed_options]
        
        # Находим новый индекс правильного ответа
        new_correct_index = shuffled_indices.index(correct_original_index)
        
        # Сохраняем маппинг для проверки
        questions_mapping.append({
            "question_id": q["id"],
            "correct_index": new_correct_index,
            "shuffled_order": shuffled_indices
        })
        
        questions_response.append({
            "id": q["id"],
            "question": q["question"],
            "options": shuffled_options,
            "order_num": q["order_num"]
        })
    
    # Сохраняем маппинг в сессии
    active_sessions[user["id"]] = TestSession(
        test_id=test_id,
        questions_order=questions_order,
        questions_mapping=questions_mapping,
        started_at=datetime.now(),
        time_limit=time_limit
    )
    
    return {
        "id": test["id"],
        "title": test["title"],
        "description": test["description"],
        "section_id": test["section_id"],
        "questions": questions_response,
        "total_questions": len(questions),
        "has_timer": True,
        "time_limit": time_limit
    }


@router.post("/{test_id}/submit")
async def submit_test(
    test_id: int, 
    request: SubmitTestRequest, 
    user: dict = Depends(get_current_user)
):
    """Отправить результаты теста (с проверкой на сервере)"""
    
    session = active_sessions.get(user["id"])
    if not session or session.test_id != test_id:
        raise HTTPException(400, "Сессия не найдена. Пожалуйста, начните тест заново.")
    
    correct = 0
    user_answers_list = []
    
    # Используем маппинг из сессии
    for i, mapping in enumerate(session.questions_mapping):
        if i >= len(request.answers):
            continue
            
        user_answer = request.answers[i]
        correct_answer = mapping["correct_index"]
        
        is_correct = user_answer == correct_answer
        
        user_answers_list.append({
            "question_id": mapping["question_id"],
            "user_answer": user_answer,
            "is_correct": is_correct
        })
        
        if is_correct:
            correct += 1
    
    total = len(session.questions_mapping)
    percentage = round(correct / total * 100) if total > 0 else 0
    passed = percentage >= 70
    
    # Сохраняем в БД
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO test_stats (user_id, section_id, correct_answers, total_questions, last_updated)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
            (user["id"], test_id, correct, total),
        )
        
        cursor.execute(
            """
            INSERT INTO test_attempts (user_id, test_id, score, correct_answers, total_questions, answers, time_spent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                user["id"],
                test_id,
                percentage,
                correct,
                total,
                json.dumps(user_answers_list, ensure_ascii=False),
                request.time_spent
            ),
        )
        attempt_id = cursor.lastrowid
    
    # Очищаем сессию
    if user["id"] in active_sessions:
        del active_sessions[user["id"]]
    
    return {
        "correct": correct,
        "total": total,
        "percentage": percentage,
        "passed": passed,
        "attempt_id": attempt_id
    }


@router.get("/{test_id}/attempts")
async def get_test_attempts(test_id: int, user: dict = Depends(get_current_user)):
    """Получить историю попыток по тесту"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, score, correct_answers, total_questions, time_spent, created_at
            FROM test_attempts
            WHERE user_id = ? AND test_id = ?
            ORDER BY created_at DESC
        """,
            (user["id"], test_id)
        )
        attempts = cursor.fetchall()
    
    return [dict(a) for a in attempts]


@router.get("/{test_id}/attempt/{attempt_id}")
async def get_attempt_details(
    test_id: int, 
    attempt_id: int, 
    user: dict = Depends(get_current_user)
):
    """Получить детали конкретной попытки"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM test_attempts
            WHERE id = ? AND user_id = ? AND test_id = ?
        """,
            (attempt_id, user["id"], test_id)
        )
        attempt = cursor.fetchone()
        
        if not attempt:
            raise HTTPException(404, "Попытка не найдена")
        
        answers = json.loads(attempt["answers"]) if attempt["answers"] else []
        
        question_ids = [a["question_id"] for a in answers]
        if question_ids:
            placeholders = ','.join('?' * len(question_ids))
            cursor.execute(
                f"""
                SELECT id, question, option1, option2, option3
                FROM test_questions
                WHERE id IN ({placeholders})
            """,
                question_ids
            )
            questions = {row["id"]: dict(row) for row in cursor.fetchall()}
        else:
            questions = {}
    
    return {
        "attempt": dict(attempt),
        "details": [
            {
                "question": questions.get(a["question_id"], {}).get("question", "Вопрос не найден"),
                "options": [
                    questions.get(a["question_id"], {}).get("option1", ""),
                    questions.get(a["question_id"], {}).get("option2", ""),
                    questions.get(a["question_id"], {}).get("option3", ""),
                ],
                "user_answer": a["user_answer"],
                "is_correct": a["is_correct"]
            }
            for a in answers
        ]
    }


@router.get("/{test_id}/paged")
async def get_test_paged(
    test_id: int, 
    page: int = 1, 
    limit: int = 5,
    user: dict = Depends(get_current_user)
):
    """Получить тест постранично (без правильных ответов, с обратным таймером)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM tests WHERE id = ?", (test_id,))
        test = cursor.fetchone()
        
        if not test:
            raise HTTPException(404, "Тест не найден")
        
        cursor.execute(
            "SELECT COUNT(*) as total FROM test_questions WHERE test_id = ?",
            (test_id,)
        )
        total = cursor.fetchone()["total"]
        
        cursor.execute(
            """
            SELECT id, question, option1, option2, option3, correct_index, order_num
            FROM test_questions 
            WHERE test_id = ? 
            ORDER BY order_num
        """,
            (test_id,)
        )
        all_questions = cursor.fetchall()
        
        time_limit = test["time_limit"] if "time_limit" in test.keys() else (1200 if total > 10 else 600)
        
        # Создаем или получаем сессию с маппингом для всех вопросов
        if user["id"] not in active_sessions or active_sessions[user["id"]].test_id != test_id:
            # Перемешиваем вопросы
            shuffled_questions = list(all_questions)
            random.shuffle(shuffled_questions)
            
            questions_order = [q["id"] for q in shuffled_questions]
            questions_mapping = []
            
            for q in shuffled_questions:
                original_options = [q["option1"], q["option2"], q["option3"]]
                correct_original_index = q["correct_index"]
                
                indexed_options = list(enumerate(original_options))
                random.shuffle(indexed_options)
                
                shuffled_indices = [idx for idx, _ in indexed_options]
                new_correct_index = shuffled_indices.index(correct_original_index)
                
                questions_mapping.append({
                    "question_id": q["id"],
                    "correct_index": new_correct_index,
                    "shuffled_order": shuffled_indices
                })
            
            active_sessions[user["id"]] = TestSession(
                test_id=test_id,
                questions_order=questions_order,
                questions_mapping=questions_mapping,
                started_at=datetime.now(),
                time_limit=time_limit
            )
        
        session = active_sessions[user["id"]]
        
        # Получаем вопросы для текущей страницы
        offset = (page - 1) * limit
        page_question_ids = session.questions_order[offset:offset + limit]
        
        if page_question_ids:
            placeholders = ','.join('?' * len(page_question_ids))
            cursor.execute(
                f"""
                SELECT id, question, option1, option2, option3
                FROM test_questions 
                WHERE id IN ({placeholders})
            """,
                page_question_ids
            )
            questions_data = {row["id"]: row for row in cursor.fetchall()}
            
            # Получаем маппинг для вопросов на этой странице
            page_mapping = {m["question_id"]: m for m in session.questions_mapping}
            
            questions = []
            for q_id in page_question_ids:
                q = questions_data.get(q_id)
                mapping = page_mapping.get(q_id)
                if q and mapping:
                    # Восстанавливаем порядок вариантов из маппинга
                    shuffled_order = mapping.get("shuffled_order", [0, 1, 2])
                    original_options = [q["option1"], q["option2"], q["option3"]]
                    
                    # Сортируем варианты согласно shuffled_order
                    options = [original_options[shuffled_order[0]], original_options[shuffled_order[1]], original_options[shuffled_order[2]]]
                    
                    questions.append({
                        "id": q["id"],
                        "question": q["question"],
                        "options": options,
                        "order_num": q["order_num"]
                    })
        else:
            questions = []
    
    return {
        "id": test["id"],
        "title": test["title"],
        "description": test["description"],
        "section_id": test["section_id"],
        "questions": questions,
        "current_page": page,
        "total_pages": (total + limit - 1) // limit,
        "total_questions": total,
        "questions_per_page": limit,
        "is_paged": True,
        "has_timer": True,
        "time_limit": time_limit
    }
