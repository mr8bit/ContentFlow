#!/usr/bin/env python3
"""
Скрипт для генерации пользовательской сессии Telegram.
Эта сессия позволит читать сообщения из публичных каналов.
"""

import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

API_ID = os.getenv('TELEGRAM_API_ID')
API_HASH = os.getenv('TELEGRAM_API_HASH')

if not API_ID or not API_HASH:
    print("❌ Ошибка: TELEGRAM_API_ID и TELEGRAM_API_HASH должны быть установлены в .env файле")
    exit(1)

async def generate_user_session():
    print("🔐 Генерация пользовательской сессии Telegram")
    print("📱 Вам потребуется ваш номер телефона и код подтверждения")
    print()
    
    # Создаем клиент с пустой сессией
    client = TelegramClient(StringSession(), API_ID, API_HASH)
    
    try:
        await client.start()
        
        # Получаем информацию о пользователе
        me = await client.get_me()
        print(f"✅ Успешно авторизованы как: {me.first_name} {me.last_name or ''} (@{me.username or 'без username'})")
        
        if me.bot:
            print("❌ Ошибка: Это bot-аккаунт. Нужен обычный пользовательский аккаунт.")
            return
        
        # Получаем строку сессии
        session_string = client.session.save()
        
        print()
        print("🎉 Пользовательская сессия успешно создана!")
        print()
        print("📋 Скопируйте эту строку сессии в ваш .env файл:")
        print(f"TELEGRAM_SESSION_STRING={session_string}")
        print()
        print("⚠️  ВАЖНО: Эта сессия дает полный доступ к вашему Telegram аккаунту.")
        print("   Храните её в безопасности и не передавайте третьим лицам.")
        
    except Exception as e:
        print(f"❌ Ошибка при создании сессии: {e}")
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(generate_user_session())