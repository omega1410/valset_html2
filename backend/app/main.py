from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

from app.database import init_db
from app.routes import (
    sections,
    auth,
    files,
    admin_sections,
    admin_users,
    admin_files,
    admin_tests,
    tests,
    admin_checklists,
    logbook,
    news,
    admin_news,
    stats,
    feedback,
)
from app.routes import tests as tests_route, checklists, ai
from app.utils.search_fts import init_fts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Инициализация базы данных...")
    init_db()
    logger.info("Инициализация FTS5 для морфологического поиска...")
    init_fts()
    logger.info("Готово!")
    yield


app = FastAPI(
    title="Веб отель",
    description="Веб-приложение для адаптации сотрудников",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем статику (фото)
assets_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "assets"
)
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

avatars_path = os.path.join(os.path.dirname(__file__), "avatars")
if not os.path.exists(avatars_path):
    os.makedirs(avatars_path, exist_ok=True)
app.mount("/avatars", StaticFiles(directory=avatars_path), name="avatars")
print(f"Аватары загружаются из: {avatars_path}")

# Регистрируем роутеры
app.include_router(auth.router, prefix="/api/auth", tags=["Авторизация"])
app.include_router(sections.router, prefix="/api/sections", tags=["Разделы"])
app.include_router(files.router, prefix="/api/files", tags=["Файлы"])
app.include_router(admin_sections.router, prefix="/api/admin", tags=["Admin - Разделы"])
app.include_router(
    admin_users.router, prefix="/api/admin", tags=["Admin - Пользователи"]
)
app.include_router(admin_files.router, prefix="/api/admin", tags=["Admin - Файлы"])
app.include_router(tests_route.router, prefix="/api/tests", tags=["Тесты"])
app.include_router(admin_tests.router, prefix="/api/admin", tags=["Admin - Тесты"])
app.include_router(checklists.router, prefix="/api/checklists", tags=["Чек-листы"])
app.include_router(
    admin_checklists.router, prefix="/api/admin", tags=["Admin - Чек-листы"]
)
app.include_router(ai.router, prefix="/api/ai", tags=["AI Помощник"])
app.include_router(logbook.router, prefix="/api/logbook", tags=["Логбук"])
app.include_router(news.router, prefix="/api/news", tags=["Новости"])
app.include_router(admin_news.router, prefix="/api/admin", tags=["Admin - Новости"])
app.include_router(stats.router, prefix="/api/stats", tags=["Статистика"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Обратная связь"])


@app.get("/")
async def root():
    return {"message": "Отель Бот API работает", "status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
