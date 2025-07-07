#!/usr/bin/env python3
"""
Тестовый скрипт для проверки исправления проблемы с экранированными символами \n
"""

import asyncio
import sys
import os

from database import SessionLocal
import crud
from models import Post
from datetime import datetime, timezone

async def test_newline_fix():
    """Тест исправления проблемы с переносами строк"""
    print("🧪 Тестирование исправления проблемы с экранированными символами...")
    
    # Создаем тестовый текст с экранированными символами
    test_text = "Тест с переносами строк:\\nПервая строка\\nВторая строка\\n\\nТретья строка после пустой\\n\\nИ еще одна строка"
    
    print(f"📝 Исходный текст: {repr(test_text)}")
    
    # Применяем исправление (как в worker.py)
    fixed_text = test_text.replace('\\n', '\n').replace('\\t', '\t')
    
    print(f"✅ Исправленный текст: {repr(fixed_text)}")
    print(f"📄 Как будет выглядеть в Telegram:")
    print(fixed_text)
    
    # Создаем пост в базе данных
    db = SessionLocal()
    try:
        new_post = Post(
            original_text=test_text,
            processed_text=fixed_text,
            target_channel_id=1,
            status='pending',
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        
        print(f"📊 Создан тестовый пост с ID: {new_post.id}")
        print(f"🎯 Статус: {new_post.status}")
        print(f"📅 Время создания: {new_post.created_at}")
        
        return new_post.id
        
    except Exception as e:
        print(f"❌ Ошибка при создании поста: {e}")
        db.rollback()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    post_id = asyncio.run(test_newline_fix())
    if post_id:
        print(f"\n🎉 Тест завершен! Пост {post_id} создан и будет обработан worker'ом.")
        print(f"📱 Проверьте Telegram канал через несколько секунд.")
    else:
        print(f"\n❌ Тест не удался.")