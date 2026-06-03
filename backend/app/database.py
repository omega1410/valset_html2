import sqlite3
import os
import hashlib
import secrets
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta

# Московское время
MSK_TZ = timezone(timedelta(hours=3))


def now_msk():
    return datetime.now(MSK_TZ).strftime("%Y-%m-%d %H:%M:%S")


DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data.db"
)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}:{hash_obj.hexdigest()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, hash_value = hashed_password.split(":")
        hash_obj = hashlib.sha256((plain_password + salt).encode())
        return hash_obj.hexdigest() == hash_value
    except:
        return False


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Инициализация базы данных"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Таблица пользователей
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Таблица whitelist (для совместимости)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whitelist (
                user_id INTEGER PRIMARY KEY,
                name TEXT,
                email TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Таблица разделов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                photo_id TEXT,
                photo_id2 TEXT,
                photo_id3 TEXT,
                photo_id4 TEXT,
                photo_id5 TEXT,
                photo_id6 TEXT,
                photo_id7 TEXT
            )
        """)

        # Таблица тестов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_stats (
                user_id INTEGER NOT NULL,
                section_id INTEGER NOT NULL,
                correct_answers INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, section_id)
            )
        """)

        # Таблица логбука
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logbook (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_number TEXT,
                task TEXT NOT NULL,
                assignee TEXT,
                author_id INTEGER,
                author_name TEXT,
                comment TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users(id)
            )
        """)

        # Таблица вопросов для тестов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                option1 TEXT NOT NULL,
                option2 TEXT NOT NULL,
                option3 TEXT NOT NULL,
                correct_index INTEGER NOT NULL,
                order_num INTEGER DEFAULT 0
            )
        """)

        # Таблица задач чек-листов
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shift_type TEXT NOT NULL,
                task_text TEXT NOT NULL,
                task_order INTEGER NOT NULL
            )
        """)

        # Таблица новостей
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                author_id INTEGER,
                author_name TEXT,
                is_published BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Добавляем тестового администратора (если нет пользователей)
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            hashed_password = hash_password("admin123")
            cursor.execute(
                """
                INSERT INTO users (email, full_name, password_hash, role)
                VALUES (?, ?, ?, ?)
            """,
                ("admin@hotel.com", "Администратор", hashed_password, "admin"),
            )

            # Добавляем тестовые разделы
            cursor.execute("SELECT COUNT(*) FROM sections")
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    """
                    INSERT INTO sections (title, content) 
                    VALUES (?, ?)
                """,
                    (
                        "Как заселить гостя",
                        "Пошаговая инструкция по заселению гостя:\n\n"
                        "1. Поприветствовать гостя\n"
                        "2. Попросить документы\n"
                        "3. Найти бронирование в системе\n"
                        "4. Оформить заселение\n"
                        "5. Выдать ключи",
                    ),
                )

                cursor.execute(
                    """
                    INSERT INTO sections (title, content) 
                    VALUES (?, ?)
                """,
                    (
                        "Ранний заезд",
                        "Правила раннего заезда:\n\n"
                        "• До 06:00 - полная стоимость ночи\n"
                        "• 06:00-12:00 - 50% стоимости\n"
                        "• После 12:00 - бесплатно (если номер готов)",
                    ),
                )

            print("✅ Создан администратор: admin@hotel.com / admin123")

            # Таблицы для мессенджера
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    type TEXT DEFAULT 'group',  -- 'group' или 'private'
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversation_members (
                    conversation_id INTEGER,
                    user_id INTEGER,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    muted BOOLEAN DEFAULT 0,
                    mentions_only BOOLEAN DEFAULT 0,
                    disabled BOOLEAN DEFAULT 0,
                    PRIMARY KEY (conversation_id, user_id),
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    author_id INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    endpoint TEXT NOT NULL UNIQUE,
                    p256dh TEXT NOT NULL,
                    auth TEXT NOT NULL,
                    device_info TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            cursor.execute("""
                CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
            """)
            cursor.execute("""
                CREATE INDEX idx_members_user ON conversation_members(user_id);
            """)

            # Таблица для сброса пароля
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS password_resets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    token TEXT NOT NULL UNIQUE,
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Индексы для оптимизации
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_checklist_progress_user ON checklist_progress(user_id)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_checklist_progress_shift ON checklist_progress(shift_type)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_logbook_author ON logbook(author_id)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_logbook_status ON logbook(status)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_test_stats_user ON test_stats(user_id)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_news_created ON news(created_at DESC)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_members_user ON conversation_members(user_id)"
            )

        conn.commit()


def get_user_by_email(email: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE email = ? AND is_active = 1", (email,)
        )
        return cursor.fetchone()
