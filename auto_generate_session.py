#!/usr/bin/env python3
"""
Автоматическая генерация Telethon сессии
Использует существующие переменные окружения для создания сессии
"""

import os
import asyncio
from dotenv import load_dotenv
from telethon import TelegramClient
from telethon.sessions import StringSession

# Загружаем переменные окружения
load_dotenv()

def get_env_vars():
    """Получаем необходимые переменные окружения"""
    api_id = os.getenv('TELEGRAM_API_ID')
    api_hash = os.getenv('TELEGRAM_API_HASH')
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    
    if not api_id or not api_hash or not bot_token:
        raise ValueError("Отсутствуют необходимые переменные окружения: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN")
    
    return int(api_id), api_hash, bot_token

async def generate_session_string():
    """Автоматически генерирует строку сессии для бота"""
    try:
        api_id, api_hash, bot_token = get_env_vars()
        
        print("🤖 Создание сессии для Telegram бота...")
        
        # Создаем клиент с пустой строковой сессией
        client = TelegramClient(StringSession(), api_id, api_hash)
        
        # Авторизуемся как бот
        await client.start(bot_token=bot_token)
        
        # Получаем строку сессии
        session_string = client.session.save()
        
        print("✅ Сессия успешно создана!")
        print(f"\n=== Строка сессии ===")
        print(session_string)
        
        # Сохраняем в файл
        with open('telethon_session_string.txt', 'w') as f:
            f.write(session_string)
        
        print(f"\n📁 Сессия сохранена в файл: telethon_session_string.txt")
        
        # Обновляем .env файл
        update_env_file(session_string)
        
        await client.disconnect()
        
        return session_string
        
    except Exception as e:
        print(f"❌ Ошибка при создании сессии: {e}")
        return None

def update_env_file(session_string):
    """Обновляет .env файл с новой строкой сессии"""
    try:
        # Читаем текущий .env файл
        with open('.env', 'r') as f:
            lines = f.readlines()
        
        # Ищем и обновляем строку TELEGRAM_SESSION_STRING
        updated = False
        for i, line in enumerate(lines):
            if line.startswith('TELEGRAM_SESSION_STRING=') or line.startswith('# TELEGRAM_SESSION_STRING='):
                lines[i] = f'TELEGRAM_SESSION_STRING={session_string}\n'
                updated = True
                break
        
        # Если строка не найдена, добавляем её
        if not updated:
            # Находим секцию Telegram и добавляем после неё
            for i, line in enumerate(lines):
                if 'TELEGRAM_API_HASH=' in line:
                    lines.insert(i + 1, f'TELEGRAM_SESSION_STRING={session_string}\n')
                    break
        
        # Записываем обновленный файл
        with open('.env', 'w') as f:
            f.writelines(lines)
        
        print("✅ Файл .env обновлен с новой строкой сессии")
        
    except Exception as e:
        print(f"⚠️  Не удалось обновить .env файл: {e}")
        print("Пожалуйста, добавьте строку сессии вручную:")
        print(f"TELEGRAM_SESSION_STRING={session_string}")

def main():
    """Основная функция"""
    print("=== Автоматическая генерация Telethon сессии ===")
    print("Использует существующие переменные окружения\n")
    
    try:
        # Проверяем переменные окружения
        api_id, api_hash, bot_token = get_env_vars()
        print(f"📋 API ID: {api_id}")
        print(f"📋 API Hash: {api_hash[:8]}...")
        print(f"📋 Bot Token: {bot_token[:10]}...\n")
        
        # Генерируем сессию
        session_string = asyncio.run(generate_session_string())
        
        if session_string:
            print("\n🎉 Готово! Теперь можно перезапустить worker:")
            print("docker-compose restart worker")
        else:
            print("\n❌ Не удалось создать сессию")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())