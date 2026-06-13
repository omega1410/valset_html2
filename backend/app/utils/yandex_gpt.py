import os
import requests
import numpy as np
from typing import List, Dict, Any
import sqlite3
import textwrap

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "data.db",
)

# Yandex GPT настройки
API_KEY = os.getenv("YANDEX_API_KEY", "")
FOLDER_ID = os.getenv("YANDEX_FOLDER_ID", "")
CHAT_MODEL_URI = f"gpt://{FOLDER_ID}/yandexgpt/latest"
EMBEDDINGS_URI = f"emb://{FOLDER_ID}/text-search-doc/latest"

CHUNK_SIZE = 1000
TOP_K = 5


def call_yandex_gpt(messages: List[Dict[str, str]]) -> str:
    """Вызов Yandex GPT API с поддержкой истории сообщений"""
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Api-Key {API_KEY}",
    }
    
    # Форматируем сообщения для Yandex GPT
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "role": msg["role"],
            "text": msg["content"]
        })
    
    payload = {
        "modelUri": CHAT_MODEL_URI,
        "completionOptions": {"stream": False, "temperature": 0.3, "maxTokens": 2000},
        "messages": formatted_messages,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data["result"]["alternatives"][0]["message"]["text"]
    except Exception as e:
        print(f"Ошибка Yandex GPT: {e}")
        return "Извините, произошла ошибка при обращении к AI."


def get_embedding(text: str) -> np.ndarray:
    """Получить эмбеддинг текста"""
    url = "https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Api-Key {API_KEY}",
    }
    payload = {"modelUri": EMBEDDINGS_URI, "text": text[:2000]}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        embedding = data["embedding"]
        return np.array(embedding, dtype=np.float32)
    except Exception as e:
        print(f"Ошибка получения эмбеддинга: {e}")
        return np.zeros(768)


def load_sections() -> List[Dict[str, Any]]:
    """Загрузить все разделы из БД"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, content FROM sections")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def chunk_text(
    text: str, title: str, chunk_size: int = CHUNK_SIZE
) -> List[Dict[str, Any]]:
    """Разбить текст на чанки"""
    chunks = []
    full_text = f"{title}\n{text}"
    words = full_text.split()

    for i in range(0, len(words), chunk_size):
        chunk_text = " ".join(words[i : i + chunk_size])
        chunks.append({"text": chunk_text, "embedding": get_embedding(chunk_text)})
    return chunks


def search_similar(query: str, sections: List[Dict[str, Any]]) -> List[str]:
    """Поиск похожих фрагментов"""
    query_embedding = get_embedding(query)

    results = []
    for section in sections:
        chunks = chunk_text(section["content"], section["title"])

        for chunk in chunks:
            similarity = np.dot(query_embedding, chunk["embedding"]) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(chunk["embedding"])
                + 1e-9
            )
            results.append((similarity, chunk["text"]))

    results.sort(reverse=True, key=lambda x: x[0])
    return [text for _, text in results[:TOP_K]]


def generate_rag_answer(question: str, history: List[Dict[str, str]] = None) -> str:
    """Генерация ответа на основе БД (RAG) с учётом истории"""
    sections = load_sections()

    if not sections:
        return "База знаний пуста. Добавьте разделы через админ-панель."

    similar_chunks = search_similar(question, sections)

    if not similar_chunks:
        return "Не могу найти информацию по вашему вопросу в базе знаний."

    context = "\n\n".join(similar_chunks)
    
    # Формируем историю для контекста
    history_text = ""
    if history and len(history) > 0:
        history_text = "\n\nПредыдущие сообщения:\n"
        for msg in history:
            role = "Пользователь" if msg["role"] == "user" else "Ассистент"
            history_text += f"{role}: {msg['content']}\n"
        history_text += "\n"

    prompt = f"""Ты - AI-ассистент отеля. Отвечай на вопросы ТОЛЬКО на основе предоставленного контекста.
Если ответа нет в контексте - скажи "Информация не найдена в базе знаний".
{history_text}
Контекст из базы знаний отеля:
{context}

Вопрос пользователя: {question}

Ответ:"""

    messages = [{"role": "user", "content": prompt}]
    return call_yandex_gpt(messages)


def generate_free_answer(question: str, history: List[Dict[str, str]] = None) -> str:
    """Свободный ответ AI (без ограничений БД) с учётом истории"""
    # Формируем историю для контекста
    history_text = ""
    if history and len(history) > 0:
        history_text = "\n\nПредыдущие сообщения:\n"
        for msg in history:
            role = "Пользователь" if msg["role"] == "user" else "Ассистент"
            history_text += f"{role}: {msg['content']}\n"
        history_text += "\n"

    prompt = f"""Ты - полезный AI-ассистент для сотрудников отеля.
Отвечай на вопросы максимально полезно и информативно.
Будь вежливым и профессиональным.
{history_text}
Вопрос пользователя: {question}

Ответ:"""

    messages = [{"role": "user", "content": prompt}]
    return call_yandex_gpt(messages)
