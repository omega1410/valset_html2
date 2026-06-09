from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.database import get_db_connection

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # ========== ЛИЧНАЯ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ==========
        cursor.execute(
            """
            SELECT COUNT(*) as total_tests_passed
            FROM test_stats
            WHERE user_id = ? AND section_id != 0 AND (correct_answers * 1.0 / total_questions) >= 0.7
            """,
            (user["id"],),
        )
        tests_passed = cursor.fetchone()["total_tests_passed"]

        cursor.execute(
            """
            SELECT COUNT(*) as total_test_attempts
            FROM test_stats
            WHERE user_id = ? AND section_id != 0
            """,
            (user["id"],),
        )
        test_attempts = cursor.fetchone()["total_test_attempts"]

        cursor.execute("""
            SELECT AVG(percentage) as avg_score
            FROM (
                SELECT DISTINCT test_id, 
                       MAX(score) as percentage
                FROM test_attempts
                WHERE user_id = ? AND test_id != 0
                GROUP BY test_id
            )
        """, (user["id"],))
        avg_score = cursor.fetchone()["avg_score"] or 0

        cursor.execute(
            """
            SELECT SUM(correct_answers) as completed_checklists
            FROM test_stats
            WHERE user_id = ? AND section_id = 0
            """,
            (user["id"],),
        )
        completed_checklists = cursor.fetchone()["completed_checklists"] or 0

        cursor.execute("""
            SELECT COUNT(*) as viewed_sections
            FROM section_views
            WHERE user_id = ?
        """, (user["id"],))
        viewed_sections = cursor.fetchone()["viewed_sections"] or 0

        cursor.execute(
            """
            SELECT COUNT(*) as weekly_activity
            FROM logbook
            WHERE author_id = ? AND created_at >= date('now', '-7 days')
            """,
            (user["id"],),
        )
        weekly_activity = cursor.fetchone()["weekly_activity"] or 0

        # Общее количество тестов в системе (из таблицы tests)
        cursor.execute("SELECT COUNT(*) as total FROM tests")
        total_tests = cursor.fetchone()["total"] or 0

        # Количество пройденных тестов пользователем (>=70%)
        cursor.execute(
            """
            SELECT COUNT(DISTINCT section_id) as passed
            FROM test_stats
            WHERE user_id = ? AND section_id != 0 AND (correct_answers * 1.0 / total_questions) >= 0.7
            """,
            (user["id"],),
        )
        passed_tests = cursor.fetchone()["passed"] or 0

        tests_completion_percentage = round(passed_tests / total_tests * 100) if total_tests > 0 else 0

        # ========== АДМИН-СТАТИСТИКА ==========
        admin_stats = None
        if user["role"] == "admin":
            cursor.execute("SELECT COUNT(*) as total FROM users WHERE role = 'user'")
            total_users = cursor.fetchone()["total"] or 0

            # Общее количество тестов в системе (из таблицы tests)
            cursor.execute("SELECT COUNT(*) as total FROM tests")
            total_tests_all = cursor.fetchone()["total"] or 0

            cursor.execute("SELECT SUM(correct_answers) as total FROM test_stats WHERE section_id = 0")
            total_checklists_all = cursor.fetchone()["total"] or 0


            # Топ-3 активных сотрудников
            cursor.execute("""
                SELECT 
                    u.id,
                    u.full_name,
                    u.first_name,
                    u.last_name,
                    COALESCE((
                        SELECT COUNT(*) FROM test_stats ts 
                        WHERE ts.user_id = u.id AND ts.section_id != 0
                    ), 0) as tests_count,
                    COALESCE((
                        SELECT SUM(correct_answers) FROM test_stats ts 
                        WHERE ts.user_id = u.id AND ts.section_id = 0
                    ), 0) as checklists_count,
                    COALESCE((
                        SELECT COUNT(*) FROM logbook l 
                        WHERE l.author_id = u.id
                    ), 0) as tasks_count,
                    (COALESCE((
                        SELECT COUNT(*) FROM test_stats ts 
                        WHERE ts.user_id = u.id AND ts.section_id != 0
                    ), 0) * 2 + 
                     COALESCE((
                        SELECT SUM(correct_answers) FROM test_stats ts 
                        WHERE ts.user_id = u.id AND ts.section_id = 0
                    ), 0) * 3 +
                     COALESCE((
                        SELECT COUNT(*) FROM logbook l 
                        WHERE l.author_id = u.id
                    ), 0)) as activity_score
                FROM users u
                WHERE u.role = 'user'
                ORDER BY activity_score DESC
                LIMIT 3
            """)
            top_active = [dict(row) for row in cursor.fetchall()]

            # Топ-3 отстающих сотрудников
            cursor.execute("""
                SELECT 
                    u.id,
                    u.full_name,
                    u.first_name,
                    u.last_name,
                    COALESCE(AVG(CAST(ts.correct_answers AS FLOAT) / ts.total_questions) * 100, 0) as avg_score,
                    COALESCE((
                        SELECT COUNT(*) FROM test_stats ts2 
                        WHERE ts2.user_id = u.id AND ts2.section_id != 0
                    ), 0) as tests_count,
                    COALESCE((
                        SELECT SUM(correct_answers) FROM test_stats ts2 
                        WHERE ts2.user_id = u.id AND ts2.section_id = 0
                    ), 0) as checklists_count,
                    COALESCE((
                        SELECT COUNT(*) FROM logbook l 
                        WHERE l.author_id = u.id
                    ), 0) as tasks_count
                FROM users u
                LEFT JOIN test_stats ts ON u.id = ts.user_id AND ts.section_id != 0
                WHERE u.role = 'user'
                GROUP BY u.id
                HAVING avg_score < 50 OR (tests_count = 0 AND tasks_count = 0)
                ORDER BY avg_score ASC, tests_count ASC
                LIMIT 3
            """)
            top_struggling = [dict(row) for row in cursor.fetchall()]

            # Лучший по тестам
            cursor.execute("""
                SELECT 
                    u.id,
                    u.full_name,
                    u.first_name,
                    u.last_name,
                    AVG(CAST(ts.correct_answers AS FLOAT) / ts.total_questions) * 100 as avg_score,
                    COUNT(ts.section_id) as tests_passed
                FROM users u
                JOIN test_stats ts ON u.id = ts.user_id
                WHERE u.role = 'user' AND ts.section_id != 0
                GROUP BY u.id
                HAVING COUNT(ts.section_id) >= 2
                ORDER BY avg_score DESC
                LIMIT 1
            """)
            best_in_tests = cursor.fetchone()
            best_in_tests = dict(best_in_tests) if best_in_tests else None

            # Лучший по чек-листам
            cursor.execute("""
                SELECT 
                    u.id,
                    u.full_name,
                    u.first_name,
                    u.last_name,
                    SUM(ts.correct_answers) as checklists_count
                FROM users u
                JOIN test_stats ts ON u.id = ts.user_id
                WHERE u.role = 'user' AND ts.section_id = 0
                GROUP BY u.id
                ORDER BY checklists_count DESC
                LIMIT 1
            """)
            best_in_checklists = cursor.fetchone()
            best_in_checklists = dict(best_in_checklists) if best_in_checklists else None

            admin_stats = {
                "total_users": total_users,
                "total_tests_all": total_tests_all,
                "total_checklists_all": total_checklists_all,
                "top_active": top_active,
                "top_struggling": top_struggling,
                "best_in_tests": best_in_tests,
                "best_in_checklists": best_in_checklists,
            }

    return {
        "personal": {
            "tests_passed": tests_passed,
            "test_attempts": test_attempts,
            "avg_score": round(avg_score, 1),
            "completed_checklists": completed_checklists,
            "viewed_sections": viewed_sections,
            "weekly_activity": weekly_activity,
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "tests_completion_percentage": tests_completion_percentage,
        },
        "admin": admin_stats,
    }
