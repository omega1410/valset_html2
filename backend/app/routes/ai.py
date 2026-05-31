from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import os

from app.auth import get_current_user
from app.utils.yandex_gpt import generate_rag_answer, generate_free_answer

router = APIRouter()


class Question(BaseModel):
    text: str
    mode: str = "rag"  # rag или free


class ChatMessage(BaseModel):
    role: str
    content: str


# Хранилище сессий (временно, в памяти)
chat_sessions: Dict[int, List[ChatMessage]] = {}


@router.post("/chat")
async def chat(question: Question, user: dict = Depends(get_current_user)):
    """Общение с AI-помощником"""
    user_id = user["id"]

    # Инициализируем сессию если нет
    if user_id not in chat_sessions:
        chat_sessions[user_id] = []

    # Сохраняем вопрос пользователя
    chat_sessions[user_id].append(ChatMessage(role="user", content=question.text))

    # Генерируем ответ в зависимости от режима
    if question.mode == "rag":
        answer = generate_rag_answer(question.text)
    else:
        answer = generate_free_answer(question.text)

    # Сохраняем ответ AI
    chat_sessions[user_id].append(ChatMessage(role="assistant", content=answer))

    # Ограничиваем историю 20 сообщениями
    if len(chat_sessions[user_id]) > 20:
        chat_sessions[user_id] = chat_sessions[user_id][-20:]

    return {"answer": answer, "mode": question.mode}


@router.get("/chat/history")
async def get_chat_history(user: dict = Depends(get_current_user)):
    """Получить историю чата"""
    user_id = user["id"]
    return chat_sessions.get(user_id, [])


@router.delete("/chat/history")
async def clear_chat_history(user: dict = Depends(get_current_user)):
    """Очистить историю чата"""
    user_id = user["id"]
    chat_sessions[user_id] = []
    return {"message": "История чата очищена"}
