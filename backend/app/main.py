from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging
import httpx

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
    logger.info("Инициализация FTS5...")
    init_fts()
    logger.info("Готово!")
    yield


app = FastAPI(
    title="Веб отель",
    description="Веб-приложение для адаптации сотрудников",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Пути для статики (работает локально)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
assets_path = os.path.join(BASE_DIR, "assets")
avatars_path = os.path.join(os.path.dirname(__file__), "avatars")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

os.makedirs(avatars_path, exist_ok=True)
app.mount("/avatars", StaticFiles(directory=avatars_path), name="avatars")

# Роутеры (без изменений)
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
#app.include_router(feedback.router, prefix="/api/feedback", tags=["Обратная связь"])

app.add_middleware(GZipMiddleware, minimum_size=500)


@app.get("/")
async def root():
    return {"message": "Отель Бот API работает", "status": "ok"}

@app.get("/test-weather")
async def test_weather():
    return {"message": "test ok"}

@app.get("/api/weather")
async def proxy_weather(lat: float, lon: float):
    api_key = "4b436612a6188029c780d3c33da1d409"
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&lang=ru&appid={api_key}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        return resp.json()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
