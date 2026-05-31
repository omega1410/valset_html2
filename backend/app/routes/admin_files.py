from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pathlib import Path
import os
import shutil

from app.auth import get_current_admin

router = APIRouter()

DOWNLOADS_DIR = Path(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "downloads",
    )
)
DOWNLOADS_DIR.mkdir(exist_ok=True)


@router.get("/files")
async def list_files_admin(admin: dict = Depends(get_current_admin)):
    """Список файлов для админа"""
    files = []
    for file_path in DOWNLOADS_DIR.iterdir():
        if file_path.is_file():
            files.append(
                {
                    "name": file_path.name,
                    "size": file_path.stat().st_size,
                    "modified": file_path.stat().st_mtime,
                }
            )
    return files


@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...), admin: dict = Depends(get_current_admin)
):
    """Загрузить файл"""
    file_path = DOWNLOADS_DIR / file.filename

    counter = 1
    while file_path.exists():
        name, ext = os.path.splitext(file.filename)
        file_path = DOWNLOADS_DIR / f"{name}_{counter}{ext}"
        counter += 1

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"message": "Файл загружен", "filename": file_path.name}


@router.delete("/files/{filename}")
async def delete_file(filename: str, admin: dict = Depends(get_current_admin)):
    """Удалить файл"""
    file_path = DOWNLOADS_DIR / filename

    if not file_path.exists():
        raise HTTPException(404, "Файл не найден")

    os.remove(file_path)
    return {"message": "Файл удалён"}
