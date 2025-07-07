#!/usr/bin/env python3
"""
Простой скрипт для получения списка постов из Telegram канала.
Использует те же классы и методы что и worker.
"""

import asyncio
import logging
import sys
from datetime import datetime
from telegram_scraper_service import telegram_scraper
from database import SessionLocal
import crud

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def get_channel_posts(channel_identifier: str, limit: int = 50):
    """
    Получить список постов из указанного канала.
    
    Args:
        channel_identifier: ID или username канала (например: @channelname или testchannel)
        limit: Количество сообщений для получения (по умолчанию 50)
    """
    logger.info(f"🚀 Начинаю получение постов из канала: {channel_identifier}")
    logger.info(f"📊 Лимит сообщений: {limit}")
    
    try:
        # Инициализируем Telegram клиент
        if not await telegram_scraper.initialize():
            logger.error("❌ Не удалось инициализировать Telegram клиент")
            return []
        
        logger.info("✅ Telegram клиент успешно инициализирован")
        
        # Получаем историю сообщений из канала
        messages = await telegram_scraper.scrape_channel_history(
            channel_identifier, 
            limit=limit
        )
        
        if not messages:
            logger.warning(f"⚠️ Не найдено сообщений в канале {channel_identifier}")
            return []
        
        logger.info(f"📨 Получено {len(messages)} сообщений из канала {channel_identifier}")
        
        # Выводим информацию о каждом сообщении
        print(f"\n📋 Список постов из канала {channel_identifier}:")
        print("=" * 80)
        
        for i, msg in enumerate(messages, 1):
            print(f"\n📌 Пост #{i}")
            print(f"🆔 ID сообщения: {msg.get('message_id', 'N/A')}")
            print(f"📅 Дата: {msg.get('date', 'N/A')}")
            print(f"👤 Отправитель: {msg.get('username', 'N/A')} ({msg.get('first_name', '')} {msg.get('last_name', '')})")
            print(f"👀 Просмотры: {msg.get('views', 0)}")
            print(f"🔄 Пересылки: {msg.get('forwards', 0)}")
            
            # Показываем текст сообщения (первые 200 символов)
            message_text = msg.get('message', '')
            if message_text:
                preview = message_text[:200] + '...' if len(message_text) > 200 else message_text
                print(f"📝 Текст: {preview}")
            else:
                print("📝 Текст: [Нет текста]")
            
            # Показываем информацию о медиа
            if msg.get('media_type'):
                print(f"🖼️ Медиа: {msg.get('media_type')} ({msg.get('media_path', 'N/A')})")
            else:
                print("🖼️ Медиа: Нет")
            
            print("-" * 40)
        
        return messages
        
    except Exception as e:
        logger.error(f"💥 Ошибка при получении постов: {str(e)}")
        return []
    
    finally:
        # Отключаемся от Telegram
        await telegram_scraper.disconnect()
        logger.info("🔌 Отключение от Telegram завершено")


async def list_available_channels():
    """
    Показать список доступных каналов из базы данных.
    """
    try:
        db = SessionLocal()
        channels = crud.get_source_channels(db, active_only=False)
        
        if not channels:
            print("📭 В базе данных нет настроенных каналов")
            return
        
        print(f"\n📋 Доступные каналы в базе данных ({len(channels)}):")
        print("=" * 60)
        
        for i, channel in enumerate(channels, 1):
            status = "🟢 Активен" if channel.is_active else "🔴 Неактивен"
            print(f"{i}. {channel.channel_name} (@{channel.channel_id}) - {status}")
        
        db.close()
        
    except Exception as e:
        logger.error(f"Ошибка при получении списка каналов: {str(e)}")


async def main():
    """
    Главная функция скрипта.
    """
    print("🤖 Скрипт для получения постов из Telegram каналов")
    print("=" * 50)
    
    # Показываем доступные каналы
    await list_available_channels()
    
    # Получаем параметры из командной строки или запрашиваем у пользователя
    if len(sys.argv) >= 2:
        channel_identifier = sys.argv[1]
        limit = int(sys.argv[2]) if len(sys.argv) >= 3 else 50
    else:
        print("\n💡 Использование:")
        print("   python get_channel_posts.py <channel_id> [limit]")
        print("\n📝 Примеры:")
        print("   python get_channel_posts.py testhuypizda 20")
        print("   python get_channel_posts.py @channelname 100")
        
        # Интерактивный ввод
        channel_identifier = input("\n🔤 Введите ID или username канала: ").strip()
        if not channel_identifier:
            print("❌ Не указан канал")
            return
        
        try:
            limit_input = input("📊 Введите количество сообщений (по умолчанию 50): ").strip()
            limit = int(limit_input) if limit_input else 50
        except ValueError:
            limit = 50
    
    # Получаем посты
    messages = await get_channel_posts(channel_identifier, limit)
    
    if messages:
        print(f"\n✅ Успешно получено {len(messages)} сообщений")
    else:
        print("\n❌ Не удалось получить сообщения")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️ Скрипт остановлен пользователем")
    except Exception as e:
        logger.error(f"Критическая ошибка: {str(e)}")
        sys.exit(1)