from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Пройденные тесты (тесты с баллом >= 70%, исключая чек-листы)
        cursor.execute(
            """
            SELECT COUNT(*) as total_tests_passed
            FROM test_stats
            WHERE user_id = ? AND section_id != 0 AND (correct_answers * 1.0 / total_questions) >= 0.7
        """,
            (user["id"],),
        )
        tests_passed = cursor.fetchone()["total_tests_passed"]

        # Всего попыток тестов (исключая чек-листы)
        cursor.execute(
            """
            SELECT COUNT(*) as total_test_attempts
            FROM test_stats
            WHERE user_id = ? AND section_id != 0
        """,
            (user["id"],),
        )
        test_attempts = cursor.fetchone()["total_test_attempts"]

        # Средний балл по тестам (исключая чек-листы)
        cursor.execute(
            """
            SELECT AVG(CAST(correct_answers AS FLOAT) / total_questions) * 100 as avg_score
            FROM test_stats
            WHERE user_id = ? AND section_id != 0
        """,
            (user["id"],),
        )
        avg_score = cursor.fetchone()["avg_score"] or 0

        # Количество выполненных чек-листов (section_id = 0)
        cursor.execute(
            """
            SELECT SUM(correct_answers) as completed_checklists
            FROM test_stats
            WHERE user_id = ? AND section_id = 0
        """,
            (user["id"],),
        )
        completed_checklists = cursor.fetchone()["completed_checklists"] or 0

        # Просмотренные разделы (уникальные разделы, по которым есть тесты)
        cursor.execute(
            """
            SELECT COUNT(DISTINCT section_id) as viewed_sections
            FROM test_stats
            WHERE user_id = ? AND section_id != 0
        """,
            (user["id"],),
        )
        viewed_sections = cursor.fetchone()["viewed_sections"] or 0

        # Активность за последние 7 дней (сообщения в логбуке)
        cursor.execute(
            """
            SELECT COUNT(*) as weekly_activity
            FROM logbook
            WHERE author_id = ? AND created_at >= date('now', '-7 days')
        """,
            (user["id"],),
        )
        weekly_activity = cursor.fetchone()["weekly_activity"] or 0

        # Для админов - общая статистика по всем пользователям
        total_users = 0
        total_tests_all = 0
        total_checklists_all = 0
        if user["role"] == "admin":
            cursor.execute("SELECT COUNT(*) as total FROM users WHERE role = 'user'")
            total_users = cursor.fetchone()["total"] or 0

            cursor.execute(
                "SELECT COUNT(*) as total FROM test_stats WHERE section_id != 0"
            )
            total_tests_all = cursor.fetchone()["total"] or 0

            cursor.execute(
                "SELECT SUM(correct_answers) as total FROM test_stats WHERE section_id = 0"
            )
            total_checklists_all = cursor.fetchone()["total"] or 0

    return {
        "personal": {
            "tests_passed": tests_passed,
            "test_attempts": test_attempts,
            "avg_score": round(avg_score, 1),
            "completed_checklists": completed_checklists,
            "viewed_sections": viewed_sections,
            "weekly_activity": weekly_activity,
        },
        "admin": (
            {
                "total_users": total_users,
                "total_tests_all": total_tests_all,
                "total_checklists_all": total_checklists_all,
            }
            if user["role"] == "admin"
            else None
        ),
    }


@router.get("/leaderboard")
async def get_leaderboard(limit: int = 10, admin: dict = Depends(get_current_user)):
    """Топ пользователей по тестам (только для админов)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT 
                u.id,
                u.full_name,
                COUNT(DISTINCT CASE WHEN ts.section_id != 0 THEN ts.section_id END) as tests_completed,
                AVG(CASE WHEN ts.section_id != 0 THEN CAST(ts.correct_answers AS FLOAT) / ts.total_questions END) * 100 as avg_score,
                COALESCE(SUM(CASE WHEN ts.section_id = 0 THEN ts.correct_answers END), 0) as checklists_completed
            FROM users u
            LEFT JOIN test_stats ts ON u.id = ts.user_id
            WHERE u.role = 'user'
            GROUP BY u.id
            ORDER BY avg_score DESC
            LIMIT ?
        """,
            (limit,),
        )
        leaderboard = cursor.fetchall()

    return [dict(row) for row in leaderboard]
