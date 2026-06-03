from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import os

from app.auth import get_current_user, get_current_admin

router = APIRouter()

DOWNLOADS_DIR = Path(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "downloads",
    )
)
DOWNLOADS_DIR.mkdir(exist_ok=True)


# Публичный эндпоинт для скачивания (без авторизации)
@router.get("/download/{filename}")
async def download_file(filename: str):
    """Скачать файл (публичный доступ)"""
    file_path = DOWNLOADS_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")

    return FileResponse(
        path=file_path, filename=filename, media_type="application/octet-stream"
    )


# Эндпоинты для админов (требуют авторизации)
@router.get("/list")
async def list_files(user: dict = Depends(get_current_user)):
    """Получить список доступных для скачивания файлов"""
    files = []
    for file_path in DOWNLOADS_DIR.iterdir():
        if file_path.is_file():
            files.append(
                {
                    "name": file_path.name,
                    "size": file_path.stat().st_size,
                    "url": f"/api/files/download/{file_path.name}",
                }
            )
    return files
