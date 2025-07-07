import asyncio
import logging
import sqlite3
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from telethon import TelegramClient, events
from telethon.errors import FloodWaitError, ChannelPrivateError, UsernameNotOccupiedError, AuthKeyUnregisteredError, SessionPasswordNeededError
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
from telethon.sessions import StringSession
from config import settings
from database import get_db
from crud import get_setting

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TelegramChannelScraper:
    """Telegram channel scraper based on unnohwn/telegram-scraper implementation."""
    
    def __init__(self):
        self.client = None
        self.running = False
        self.channels_db = {}
        self.media_enabled = False
        self.session_string = None
        self.logger = logging.getLogger(self.__class__.__name__)
        
    async def _create_session_automatically(self):
        """Автоматически создает сессию используя бот-токен"""
        try:
            self.logger.info("Создание новой сессии автоматически...")
            
            if not hasattr(self, 'api_id') or not hasattr(self, 'api_hash'):
                self.logger.error("API ID или API Hash не установлены")
                return None
            
            # Создаем временный клиент для генерации сессии
            temp_client = TelegramClient(
                StringSession(),
                self.api_id,
                self.api_hash
            )
            
            # Авторизуемся как бот
            await temp_client.start(bot_token=settings.telegram_bot_token)
            
            # Получаем строку сессии
            session_string = temp_client.session.save()
            
            await temp_client.disconnect()
            
            self.logger.info("✅ Сессия успешно создана автоматически")
            return session_string
            
        except Exception as e:
            self.logger.error(f"Ошибка при автоматическом создании сессии: {e}")
            return None
    
    async def _validate_and_refresh_session(self):
        """Проверяет и обновляет сессию при необходимости"""
        try:
            if not self.session_string:
                self.logger.error("Пользовательская сессия отсутствует в базе данных")
                self.logger.error("Для чтения сообщений из публичных каналов требуется пользовательская сессия")
                self.logger.error("Подключите аккаунт Telegram через веб-интерфейс в настройках")
                return False
            
            if not hasattr(self, 'api_id') or not hasattr(self, 'api_hash'):
                self.logger.error("API ID или API Hash не установлены")
                return False
            
            # Создаем клиент с текущей сессией
            test_client = TelegramClient(
                StringSession(self.session_string),
                self.api_id,
                self.api_hash
            )
            
            # Проверяем валидность сессии
            await test_client.connect()
            
            if not await test_client.is_user_authorized():
                self.logger.error("Пользовательская сессия недействительна")
                self.logger.error("Переподключите аккаунт Telegram через веб-интерфейс в настройках")
                await test_client.disconnect()
                return False
            else:
                await test_client.disconnect()
                self.logger.info("Пользовательская сессия действительна")
                
            return True
            
        except (AuthKeyUnregisteredError, SessionPasswordNeededError) as e:
            self.logger.error(f"Пользовательская сессия устарела: {e}")
            self.logger.error("Переподключите аккаунт Telegram через веб-интерфейс в настройках")
            return False
            
        except Exception as e:
            self.logger.error(f"Ошибка при проверке сессии: {e}")
            return False
    
    async def initialize(self):
        """Initialize Telethon client."""
        try:
            logger.info("Initializing Telegram client...")
            
            # Получаем все настройки Telegram из базы данных
            db = next(get_db())
            try:
                # Получаем настройки из БД
                session_setting = get_setting(db, "telegram_session_string")
                api_id_setting = get_setting(db, "telegram_api_id")
                api_hash_setting = get_setting(db, "telegram_api_hash")
                
                # Проверяем наличие всех необходимых настроек
                if not session_setting or not session_setting.value:
                    # Fallback к переменным окружения
                    self.session_string = settings.telegram_session_string
                    if not self.session_string:
                        logger.error("No session string found in database or environment variables")
                        return False
                    logger.info("Session string loaded from environment variables")
                else:
                    self.session_string = session_setting.value
                    logger.info("Session string loaded from database")
                
                # API ID
                if not api_id_setting or not api_id_setting.value:
                    self.api_id = settings.telegram_api_id
                    if not self.api_id:
                        logger.error("No API ID found in database or environment variables")
                        return False
                    logger.info("API ID loaded from environment variables")
                else:
                    self.api_id = int(api_id_setting.value)
                    logger.info("API ID loaded from database")
                
                # API Hash
                if not api_hash_setting or not api_hash_setting.value:
                    self.api_hash = settings.telegram_api_hash
                    if not self.api_hash:
                        logger.error("No API Hash found in database or environment variables")
                        return False
                    logger.info("API Hash loaded from environment variables")
                else:
                    self.api_hash = api_hash_setting.value
                    logger.info("API Hash loaded from database")
                    
            finally:
                db.close()
            
            # Проверяем и обновляем сессию при необходимости
            if not await self._validate_and_refresh_session():
                raise Exception("Не удалось создать или проверить сессию")
            
            # Создаем основной клиент с настройками из БД
            self.client = TelegramClient(
                StringSession(self.session_string),
                self.api_id,
                self.api_hash
            )
            
            # Запускаем клиент с пользовательской сессией (без bot_token)
            # Это позволяет читать сообщения из публичных каналов
            await self.client.start()
            
            logger.info("✅ Telegram client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Telegram client: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from Telegram."""
        if self.client:
            await self.client.disconnect()
            logger.info("Telegram client disconnected")
    
    def setup_channel_database(self, channel_name: str) -> str:
        """Setup SQLite database for a channel."""
        # Create channel directory
        channel_dir = f"./data/{channel_name}"
        os.makedirs(channel_dir, exist_ok=True)
        
        # Database path
        db_path = f"{channel_dir}/{channel_name}.db"
        
        # Create database and table if not exists
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER UNIQUE,
                date TEXT,
                sender_id INTEGER,
                first_name TEXT,
                last_name TEXT,
                username TEXT,
                message TEXT,
                media_type TEXT,
                media_path TEXT,
                reply_to INTEGER,
                views INTEGER,
                forwards INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()
        
        self.channels_db[channel_name] = db_path
        return db_path
    
    async def get_channel_entity(self, channel_identifier: str):
        """Get channel entity by username or ID."""
        try:
            if channel_identifier.startswith('@'):
                channel_identifier = channel_identifier[1:]
            
            entity = await self.client.get_entity(channel_identifier)
            return entity
            
        except (ChannelPrivateError, UsernameNotOccupiedError) as e:
            logger.error(f"Channel {channel_identifier} not accessible: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error getting channel entity {channel_identifier}: {str(e)}")
            return None
    
    async def scrape_channel_history(self, channel_identifier: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Scrape historical messages from a channel."""
        try:
            entity = await self.get_channel_entity(channel_identifier)
            if not entity:
                return []
            
            channel_name = entity.username or str(entity.id)
            db_path = self.setup_channel_database(channel_name)
            
            raw_messages = []
            media_groups = {}  # grouped_id -> list of messages
            
            async for message in self.client.iter_messages(entity, limit=limit):
                try:
                    message_data = await self.process_message(message, channel_name)
                    if message_data:
                        grouped_id = message_data.get('grouped_id')
                        
                        # Group messages by grouped_id if they have media
                        if grouped_id and message_data.get('media'):
                            if grouped_id not in media_groups:
                                media_groups[grouped_id] = []
                            media_groups[grouped_id].append(message_data)
                        else:
                            raw_messages.append(message_data)
                        
                except Exception as e:
                    logger.error(f"Error processing message {message.id}: {str(e)}")
                    continue
            
            # Process media groups - combine them into single messages
            messages = []
            for group_messages in media_groups.values():
                if len(group_messages) > 1:
                    # Combine multiple media into one message
                    main_message = group_messages[0]  # Use first message as base
                    media_list = []
                    
                    # Collect all media from the group
                    for msg in group_messages:
                        if msg.get('media'):
                            media_list.append(msg['media'])
                    
                    # Update main message with media group
                    main_message['media'] = {
                        'type': 'media_group',
                        'media_list': media_list
                    }
                    
                    # Use text from the first message that has text
                    for msg in group_messages:
                        if msg.get('message', '').strip():
                            main_message['message'] = msg['message']
                            break
                    
                    messages.append(main_message)
                    self.save_message_to_db(db_path, main_message)
                else:
                    # Single media message
                    messages.extend(group_messages)
                    for msg in group_messages:
                        self.save_message_to_db(db_path, msg)
            
            # Add non-grouped messages
            for msg in raw_messages:
                messages.append(msg)
                self.save_message_to_db(db_path, msg)
            
            # Sort messages by message_id to maintain order
            messages.sort(key=lambda x: x['message_id'], reverse=True)
            
            logger.info(f"Scraped {len(messages)} messages from {channel_name} (grouped {len(media_groups)} media groups)")
            return messages
            
        except FloodWaitError as e:
            logger.warning(f"Rate limited. Waiting {e.seconds} seconds...")
            await asyncio.sleep(e.seconds)
            return []
        except Exception as e:
            logger.error(f"Error scraping channel {channel_identifier}: {str(e)}")
            return []
    
    async def process_message(self, message, channel_name: str) -> Optional[Dict[str, Any]]:
        """Process a single message and extract data."""
        try:
            # Skip empty messages
            if not message.message and not message.media:
                return None
            
            # Extract sender info
            sender_id = message.sender_id if message.sender_id else 0
            first_name = ""
            last_name = ""
            username = ""
            
            if message.sender:
                first_name = getattr(message.sender, 'first_name', '') or ""
                last_name = getattr(message.sender, 'last_name', '') or ""
                username = getattr(message.sender, 'username', '') or ""
            
            # Check if message is part of a media group
            grouped_id = getattr(message, 'grouped_id', None)
            
            # Handle media
            media_info = None
            
            if message.media:
                if self.media_enabled:
                    media_type, media_path = await self.handle_media(message, channel_name)
                    if media_type and media_path:
                        media_info = {
                            'type': media_type,
                            'file_path': media_path,
                            'grouped_id': grouped_id
                        }
                else:
                    # Just identify media type without downloading
                    if isinstance(message.media, MessageMediaPhoto):
                        media_type = "photo"
                    elif isinstance(message.media, MessageMediaDocument):
                        if message.media.document.mime_type.startswith('video/'):
                            media_type = "video"
                        else:
                            media_type = "document"
                    else:
                        media_type = "other"
                    
                    media_info = {
                        'type': media_type,
                        'file_path': None,
                        'grouped_id': grouped_id
                    }
            
            message_data = {
                'message_id': message.id,
                'date': message.date.isoformat() if message.date else datetime.now(timezone.utc).isoformat(),
                'sender_id': sender_id,
                'first_name': first_name,
                'last_name': last_name,
                'username': username,
                'message': message.message or "",
                'media': media_info,
                'grouped_id': grouped_id,
                'reply_to': message.reply_to_msg_id if message.reply_to else None,
                'views': getattr(message, 'views', 0) or 0,
                'forwards': getattr(message, 'forwards', 0) or 0
            }
            
            return message_data
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return None
    
    async def handle_media(self, message, channel_name: str) -> tuple:
        """Handle media download and return media type and path."""
        try:
            media_dir = f"./data/{channel_name}/media"
            os.makedirs(media_dir, exist_ok=True)
            
            media_type = None
            media_path = None
            
            if isinstance(message.media, MessageMediaPhoto):
                media_type = "photo"
                filename = f"{message.id}.jpg"
                media_path = f"{media_dir}/{filename}"
                
                # Download photo
                await self.client.download_media(message.media, media_path)
                
            elif isinstance(message.media, MessageMediaDocument):
                document = message.media.document
                
                if document.mime_type.startswith('video/'):
                    media_type = "video"
                    ext = document.mime_type.split('/')[-1]
                    filename = f"{message.id}.{ext}"
                else:
                    media_type = "document"
                    # Try to get original filename
                    filename = f"{message.id}"
                    for attr in document.attributes:
                        if hasattr(attr, 'file_name') and attr.file_name:
                            filename = attr.file_name
                            break
                    else:
                        ext = document.mime_type.split('/')[-1] if '/' in document.mime_type else 'bin'
                        filename = f"{message.id}.{ext}"
                
                media_path = f"{media_dir}/{filename}"
                
                # Download document/video
                await self.client.download_media(message.media, media_path)
            
            return media_type, media_path
            
        except Exception as e:
            logger.error(f"Error downloading media for message {message.id}: {str(e)}")
            return None, None
    
    def save_message_to_db(self, db_path: str, message_data: Dict[str, Any]):
        """Save message data to SQLite database."""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Extract media info from new format
            media_type = None
            media_path = None
            
            if message_data.get('media'):
                media_info = message_data['media']
                if isinstance(media_info, dict):
                    if media_info.get('type') == 'media_group':
                        media_type = 'media_group'
                        # For media groups, we'll store the first media path or None
                        media_list = media_info.get('media_list', [])
                        if media_list and len(media_list) > 0:
                            media_path = media_list[0].get('file_path')
                    else:
                        media_type = media_info.get('type')
                        media_path = media_info.get('file_path')
            
            # Fallback to old format for backward compatibility
            if media_type is None and 'media_type' in message_data:
                media_type = message_data['media_type']
            if media_path is None and 'media_path' in message_data:
                media_path = message_data['media_path']
            
            cursor.execute('''
                INSERT OR REPLACE INTO messages 
                (message_id, date, sender_id, first_name, last_name, username, 
                 message, media_type, media_path, reply_to, views, forwards)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                message_data['message_id'],
                message_data['date'],
                message_data['sender_id'],
                message_data['first_name'],
                message_data['last_name'],
                message_data['username'],
                message_data['message'],
                media_type,
                media_path,
                message_data['reply_to'],
                message_data['views'],
                message_data['forwards']
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error saving message to database: {str(e)}")
    
    def get_last_message_id(self, db_path: str) -> int:
        """Get the last message ID from database."""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT MAX(message_id) FROM messages')
            result = cursor.fetchone()
            
            conn.close()
            
            return result[0] if result[0] else 0
            
        except Exception as e:
            logger.error(f"Error getting last message ID: {str(e)}")
            return 0
    
    async def monitor_channel_continuous(self, channel_identifier: str, callback=None):
        """Monitor a channel for new messages continuously."""
        try:
            entity = await self.get_channel_entity(channel_identifier)
            if not entity:
                return
            
            channel_name = entity.username or str(entity.id)
            db_path = self.setup_channel_database(channel_name)
            
            logger.info(f"Starting continuous monitoring for {channel_name}")
            
            # Get last message ID from database
            last_message_id = self.get_last_message_id(db_path)
            
            # Store for grouping media messages
            pending_media_groups = {}  # grouped_id -> {'messages': [], 'timer': asyncio.Task}
            
            async def process_media_group(grouped_id: str):
                """Process accumulated media group after delay."""
                await asyncio.sleep(2)  # Wait 2 seconds for all messages in group
                
                if grouped_id in pending_media_groups:
                    group_data = pending_media_groups[grouped_id]
                    messages = group_data['messages']
                    
                    if len(messages) > 1:
                        # Combine multiple media into one message
                        main_message = messages[0]  # Use first message as base
                        media_list = []
                        
                        # Collect all media from the group
                        for msg in messages:
                            if msg.get('media'):
                                media_list.append(msg['media'])
                        
                        # Update main message with media group
                        main_message['media'] = {
                            'type': 'media_group',
                            'media_list': media_list
                        }
                        
                        # Use text from the first message that has text
                        for msg in messages:
                            if msg.get('message', '').strip():
                                main_message['message'] = msg['message']
                                break
                        
                        self.save_message_to_db(db_path, main_message)
                        
                        # Call callback with grouped message
                        if callback:
                            logger.info(f"🔄 Calling callback for media group {grouped_id}")
                            await callback(main_message, channel_name)
                            logger.info(f"✅ Callback completed for media group {grouped_id}")
                    else:
                        # Single message in group
                        msg = messages[0]
                        self.save_message_to_db(db_path, msg)
                        if callback:
                            await callback(msg, channel_name)
                    
                    # Clean up
                    del pending_media_groups[grouped_id]
            
            @self.client.on(events.NewMessage(chats=entity))
            async def handler(event):
                try:
                    logger.info(f"🔔 NEW MESSAGE EVENT TRIGGERED for {channel_name}! Message ID: {event.message.id}")
                    logger.info(f"📝 Message text preview: {event.message.message[:100] if event.message.message else 'No text'}")
                    
                    message_data = await self.process_message(event.message, channel_name)
                    if message_data:
                        grouped_id = message_data.get('grouped_id')
                        
                        # Handle media groups
                        if grouped_id and message_data.get('media'):
                            if grouped_id not in pending_media_groups:
                                pending_media_groups[grouped_id] = {
                                    'messages': [],
                                    'timer': None
                                }
                            
                            # Add message to group
                            pending_media_groups[grouped_id]['messages'].append(message_data)
                            
                            # Cancel previous timer and start new one
                            if pending_media_groups[grouped_id]['timer']:
                                pending_media_groups[grouped_id]['timer'].cancel()
                            
                            # Start timer to process group
                            pending_media_groups[grouped_id]['timer'] = asyncio.create_task(
                                process_media_group(grouped_id)
                            )
                            
                            logger.info(f"📎 Added message {message_data['message_id']} to media group {grouped_id}")
                        else:
                            # Regular message - process immediately
                            self.save_message_to_db(db_path, message_data)
                            logger.info(f"✅ New message {message_data['message_id']} from {channel_name} processed and saved")
                            
                            # Call callback if provided
                            if callback:
                                logger.info(f"🔄 Calling callback for message {message_data['message_id']}")
                                await callback(message_data, channel_name)
                                logger.info(f"✅ Callback completed for message {message_data['message_id']}")
                            else:
                                logger.warning(f"⚠️ No callback provided for message {message_data['message_id']}")
                    else:
                        logger.warning(f"⚠️ Message {event.message.id} from {channel_name} was not processed (returned None)")
                            
                except Exception as e:
                    logger.error(f"💥 Error handling new message from {channel_name}: {str(e)}")
                    import traceback
                    logger.error(f"📋 Traceback: {traceback.format_exc()}")
            
            # Check for missed messages since last run
            if last_message_id > 0:
                logger.info(f"Checking for missed messages since {last_message_id}")
                missed_messages = await self.scrape_channel_history(channel_identifier, limit=50)
                
                for msg in missed_messages:
                    if msg['message_id'] > last_message_id:
                        if callback:
                            await callback(msg, channel_name)
            
        except Exception as e:
            logger.error(f"Error in continuous monitoring for {channel_identifier}: {str(e)}")
    
    async def start_monitoring(self, channels: List[str], callback=None):
        """Start monitoring multiple channels."""
        self.running = True
        
        # Initialize client
        if not await self.initialize():
            return
        
        try:
            # Setup monitoring for each channel
            for channel in channels:
                await self.monitor_channel_continuous(channel, callback)
            
            logger.info(f"Started monitoring {len(channels)} channels")
            
            # Keep the client running in a non-blocking way
            # Instead of run_until_disconnected(), we'll keep the connection alive
            # but allow other tasks to run
            while self.running and self.client.is_connected():
                await asyncio.sleep(1)  # Small sleep to allow other tasks
            
        except (AuthKeyUnregisteredError, SessionPasswordNeededError) as e:
            logger.warning(f"Session expired during monitoring: {e}")
            # Попытка восстановить сессию
            if await self._validate_and_refresh_session():
                logger.info("Session refreshed, restarting monitoring...")
                # Пересоздаем клиент с новой сессией
                await self.client.disconnect()
                self.client = TelegramClient(
                    StringSession(self.session_string),
                    settings.telegram_api_id,
                    settings.telegram_api_hash
                )
                await self.client.start()
                # Рекурсивно перезапускаем мониторинг
                await self.start_monitoring(channels, callback)
            else:
                raise Exception("Failed to refresh session")
        except Exception as e:
            logger.error(f"Error in monitoring: {str(e)}")
        finally:
            await self.disconnect()
    
    async def stop_monitoring(self):
        """Stop monitoring."""
        self.running = False
        if self.client:
            await self.client.disconnect()
        logger.info("Monitoring stopped")


    async def test_connection(self):
        """Test Telegram connection."""
        try:
            logger.info("Testing Telegram connection...")
            
            # Получаем все настройки Telegram из базы данных
            db = next(get_db())
            try:
                session_setting = get_setting(db, "telegram_session_string")
                api_id_setting = get_setting(db, "telegram_api_id")
                api_hash_setting = get_setting(db, "telegram_api_hash")
                
                # Session string
                if session_setting and session_setting.value:
                    session_string = session_setting.value
                else:
                    session_string = settings.telegram_session_string
                    
                if not session_string:
                    logger.error("No session string available")
                    return False
                
                # API ID
                if api_id_setting and api_id_setting.value:
                    api_id = int(api_id_setting.value)
                else:
                    api_id = settings.telegram_api_id
                    
                if not api_id:
                    logger.error("No API ID available")
                    return False
                
                # API Hash
                if api_hash_setting and api_hash_setting.value:
                    api_hash = api_hash_setting.value
                else:
                    api_hash = settings.telegram_api_hash
                    
                if not api_hash:
                    logger.error("No API Hash available")
                    return False
                    
            finally:
                db.close()
            
            # Создаем временный клиент для тестирования
            test_client = TelegramClient(
                StringSession(session_string),
                api_id,
                api_hash
            )
            
            await test_client.start()
            
            if await test_client.is_user_authorized():
                me = await test_client.get_me()
                logger.info(f"✅ Connected as: {me.first_name} (@{me.username})")
                await test_client.disconnect()
                return True
            else:
                logger.error("❌ Not authorized")
                await test_client.disconnect()
                return False
                
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False


# Global instance
telegram_scraper = TelegramChannelScraper()