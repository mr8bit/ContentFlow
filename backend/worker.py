import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models import SourceChannel, Post, PostStatus
import crud
from schemas import PostCreate
from telegram_scraper_service import telegram_scraper
from telegram_service import telegram_service
from openrouter_service import openrouter_service
from telegram.constants import ParseMode
from telegram.error import TimedOut

# DEBUG: Log when worker.py is imported
print("🔧 DEBUG: worker.py module is being imported")
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info("🔧 DEBUG: worker.py logger initialized")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ChannelMonitor:
    def __init__(self):
        self.running = False
        self.tasks = set()
        self.scraper = telegram_scraper
        self.db = SessionLocal()
        self.monitored_channels = set()  # Track currently monitored channels
        self.continuous_task = None  # Track the main monitoring task
    
    async def start(self):
        """Start the channel monitoring worker with database control."""
        logger.info("Starting channel monitor worker...")
        
        # Set running flag to True - CRITICAL!
        self.running = True
        
        # Mark worker as running in database
        crud.update_worker_status(self.db, is_running=True)
        
        # Initialize the scraper
        if not await self.scraper.initialize():
            logger.error("Failed to initialize Telegram scraper")
            crud.update_worker_status(self.db, is_running=False)
            return
        
        # Start database status checker
        status_task = asyncio.create_task(self.check_database_status())
        self.tasks.add(status_task)
        
        # Start main monitoring loop
        logger.info("🔧 DEBUG: Создаю monitor_task")
        monitor_task = asyncio.create_task(self.monitor_channels())
        self.tasks.add(monitor_task)
        logger.info(f"🔧 DEBUG: monitor_task создана: {monitor_task}")
        
        # Start post processing loop
        processor_task = asyncio.create_task(self.process_posts())
        self.tasks.add(processor_task)
        
        # Start publisher loop
        publisher_task = asyncio.create_task(self.publish_posts())
        self.tasks.add(publisher_task)
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(self.send_heartbeat())
        self.tasks.add(heartbeat_task)
        
        # Start channel reload task
        reload_task = asyncio.create_task(self.reload_channels_periodically())
        self.tasks.add(reload_task)
        
        try:
            await asyncio.gather(*self.tasks)
        except Exception as e:
            logger.error(f"Worker error: {str(e)}")
        finally:
            self.running = False
            crud.update_worker_status(self.db, is_running=False)
            self.db.close()
    
    async def stop(self):
        """Stop the channel monitoring worker."""
        logger.info("Stopping channel monitor worker...")
        self.running = False
        
        # Mark worker as stopped in database
        crud.update_worker_status(self.db, is_running=False)
        
        await self.scraper.stop_monitoring()
        
        for task in self.tasks:
            task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.db.close()
    
    async def check_database_status(self):
        """Check database for should_run flag and stop if needed."""
        while True:
            try:
                worker_status = crud.get_worker_status(self.db)
                if worker_status and not worker_status.should_run:
                    logger.info("Received stop signal from database")
                    self.running = False
                    break
                
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                logger.error(f"Error checking database status: {str(e)}")
                await asyncio.sleep(10)
    
    async def send_heartbeat(self):
        """Send periodic heartbeat to database."""
        while self.running:
            try:
                crud.update_worker_status(self.db, heartbeat=True)
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            except Exception as e:
                logger.error(f"Error sending heartbeat: {str(e)}")
                await asyncio.sleep(30)
    
    async def reload_channels_periodically(self):
        """Periodically reload channels from database and restart monitoring if needed."""
        logger.info("🔄 Запущена задача динамической перезагрузки каналов")
        
        # Wait for initial monitoring to start and monitored_channels to be populated
        while self.running and not self.monitored_channels:
            logger.info("⏳ Ожидаю инициализации списка мониторимых каналов...")
            await asyncio.sleep(5)
        
        logger.info(f"✅ Начинаю периодическую проверку каналов. Текущий список: {self.monitored_channels}")
        
        while self.running:
            try:
                # Check for new channels every 30 seconds (was 60)
                await asyncio.sleep(30)
                
                logger.info("🔍 Проверяю изменения в списке каналов...")
                
                db = SessionLocal()
                try:
                    # Get current active channels from database
                    current_channels = crud.get_source_channels(db, active_only=True)
                    current_channel_ids = {channel.channel_id for channel in current_channels}
                    
                    logger.info(f"📊 Текущие каналы в БД: {current_channel_ids}")
                    logger.info(f"📊 Мониторимые каналы: {self.monitored_channels}")
                    
                    # Check if channel list has changed
                    if current_channel_ids != self.monitored_channels:
                        logger.info(f"🔄 Обнаружены изменения в списке каналов!")
                        logger.info(f"📊 Старый список: {self.monitored_channels}")
                        logger.info(f"📊 Новый список: {current_channel_ids}")
                        
                        # Update monitored channels
                        self.monitored_channels = current_channel_ids
                        
                        # Restart monitoring with new channel list
                        await self.restart_monitoring(current_channels)
                        
                        logger.info(f"✅ Мониторинг перезапущен с обновленным списком каналов")
                    else:
                        logger.info(f"📋 Список каналов не изменился ({len(current_channel_ids)} каналов)")
                        
                finally:
                    db.close()
                    
            except Exception as e:
                logger.error(f"Error reloading channels: {str(e)}")
                await asyncio.sleep(30)  # Wait 30 seconds instead of 60 on error
    
    async def restart_monitoring(self, channels):
        """Restart monitoring with new channel list."""
        try:
            # Cancel existing continuous monitoring task if it exists
            if self.continuous_task and not self.continuous_task.done():
                logger.info(f"🛑 Останавливаю текущий мониторинг")
                self.continuous_task.cancel()
                try:
                    await self.continuous_task
                except asyncio.CancelledError:
                    pass
                
                # Remove from tasks set
                self.tasks.discard(self.continuous_task)
            
            # Start new monitoring if there are channels
            if channels:
                channel_identifiers = [channel.channel_id for channel in channels]
                
                logger.info(f"🚀 Запускаю мониторинг для {len(channel_identifiers)} каналов")
                logger.info(f"📋 Каналы: {[ch.channel_name for ch in channels]}")
                
                # Start new continuous monitoring
                self.continuous_task = asyncio.create_task(
                    self.scraper.start_monitoring(
                        channel_identifiers, 
                        callback=self.handle_new_message
                    )
                )
                self.tasks.add(self.continuous_task)
                
                logger.info(f"✅ Новый мониторинг запущен")
            else:
                logger.info(f"📭 Нет активных каналов для мониторинга")
                self.continuous_task = None
                
        except Exception as e:
            logger.error(f"Error restarting monitoring: {str(e)}")
    
    async def monitor_channels(self):
        """Main monitoring loop using TelegramChannelScraper"""
        logger.info("🚀 Запущен основной цикл мониторинга каналов")
        logger.info(f"🔧 DEBUG: monitor_channels вызван, self.running = {self.running}")
        
        try:
            db = SessionLocal()
            
            # Get active source channels
            channels = crud.get_source_channels(db, active_only=True)
            
            if not channels:
                logger.info("📭 Нет активных каналов для мониторинга")
                self.monitored_channels = set()
                return
            
            # Extract channel identifiers and update monitored channels
            channel_identifiers = [channel.channel_id for channel in channels]
            self.monitored_channels = set(channel_identifiers)
            
            logger.info(f"📡 Начинаю непрерывный мониторинг {len(channel_identifiers)} каналов")
            logger.info(f"📋 Список каналов: {[ch.channel_name for ch in channels]}")
            logger.info(f"📅 Время начала: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
            
            # Start continuous monitoring with callback (non-blocking)
            self.continuous_task = asyncio.create_task(
                self.scraper.start_monitoring(
                    channel_identifiers, 
                    callback=self.handle_new_message
                )
            )
            self.tasks.add(self.continuous_task)
            
            # Always start periodic fallback monitoring as additional backup
            logger.info("🔄 Запускаю дополнительную периодическую проверку каналов...")
            fallback_task = asyncio.create_task(self.fallback_monitoring())
            self.tasks.add(fallback_task)
            logger.info(f"✅ Fallback task создана: {fallback_task}")
            logger.info(f"📊 Всего активных задач: {len(self.tasks)}")
            
        except Exception as e:
            logger.error(f"💥 Ошибка в основном мониторинге: {str(e)}")
            logger.info("🔄 Основной мониторинг недоступен, fallback продолжает работать...")
            # Fallback monitoring is already running from the try block above
            # This provides double coverage for reliability
    
    async def handle_new_message(self, message_data: dict, channel_name: str):
        """Handle new message from TelegramChannelScraper"""
        try:
            logger.info(f"🎯 WORKER CALLBACK TRIGGERED! Processing message {message_data['message_id']} from {channel_name}")
            logger.info(f"📝 Message text: {message_data.get('message', 'No text')[:100]}...")
            
            db = SessionLocal()
            
            # Find the source channel
            # Try with @ prefix first, then without
            channel = crud.get_source_channel_by_id(db, f"@{channel_name}")
            if not channel:
                channel = crud.get_source_channel_by_id(db, channel_name)
            if not channel:
                logger.warning(f"❌ Source channel {channel_name} (tried @{channel_name} and {channel_name}) not found in database")
                return
            
            logger.info(f"✅ Found source channel: {channel.channel_name} (ID: {channel.id})")
            
            # Check if message already exists
            existing_post = crud.get_post_by_message_id(db, message_data['message_id'], channel.id)
            if existing_post:
                logger.info(f"⚠️ Message {message_data['message_id']} already exists as post {existing_post.id}")
                return  # Message already processed

            # Check if message has content (text or media)
            message_text = message_data.get('message', '')
            media_info = message_data.get('media')
            has_media = bool(media_info or message_data.get('media_type'))
            
            if not message_text.strip() and not has_media:
                logger.info(f"⏭️ Пропускаю сообщение {message_data['message_id']} - нет текста и медиафайлов")
                return

            # Prepare media data for storage
            original_media = None
            if media_info:
                # New format with media groups support
                original_media = media_info
            elif message_data.get('media_type'):
                # Legacy format - convert to new format
                original_media = {
                    'type': message_data.get('media_type'),
                    'path': message_data.get('media_path')
                }

            # Create new post from message
            post_data = {
                'source_channel_id': channel.id,
                'original_message_id': message_data['message_id'],
                'original_text': message_data['message'],
                'original_media': original_media
            }
            
            new_post = crud.create_post(db, PostCreate(**post_data))
            logger.info(f"🎉 Created new post {new_post.id} from message {message_data['message_id']} in {channel_name}")
            
            # Close the current session
            db.close()
            
            # Start processing the post with a new session
            process_task = asyncio.create_task(self.process_single_post_with_new_session(new_post.id))
            self.tasks.add(process_task)
            process_task.add_done_callback(self.tasks.discard)
            logger.info(f"🚀 Started processing task for post {new_post.id}")
            
        except Exception as e:
            logger.error(f"💥 Error handling new message from {channel_name}: {str(e)}")
            import traceback
            logger.error(f"📋 Traceback: {traceback.format_exc()}")
    
    async def fallback_monitoring(self):
        """Fallback periodic monitoring when continuous monitoring fails"""
        logger.info("🔄 Запущен резервный периодический мониторинг")
        
        while self.running:
            try:
                logger.info("🔍 Fallback мониторинг: начинаю новый цикл проверки")
                db = SessionLocal()
                
                # Get active source channels
                channels = crud.get_source_channels(db, active_only=True)
                
                if not channels:
                    logger.info("📭 Нет активных каналов для мониторинга в fallback режиме")
                    db.close()
                    await asyncio.sleep(15)
                    continue
                
                logger.info(f"🔄 Проверяю {len(channels)} каналов в fallback режиме...")
                
                checked_count = 0
                skipped_count = 0
                
                for channel in channels:
                    try:
                        logger.info(f"🔍 Fallback: проверяю канал {channel.channel_name}")
                        
                        # Log channel check interval status
                        now = datetime.now(timezone.utc)
                        if channel.last_checked:
                            time_since_last_check = (now - channel.last_checked).total_seconds()
                            logger.info(f"📊 Канал {channel.channel_name}: последняя проверка {time_since_last_check:.0f}с назад, интервал: {channel.check_interval}с")
                            
                            if time_since_last_check < channel.check_interval:
                                logger.info(f"⏭️ Пропускаю {channel.channel_name} - рано проверять")
                                skipped_count += 1
                                continue
                        else:
                            logger.info(f"📊 Канал {channel.channel_name}: проверяется впервые")
                        
                        await self.check_channel_for_new_posts(db, channel)
                        checked_count += 1
                        
                    except Exception as e:
                        logger.error(f"Error checking channel {channel.channel_name}: {str(e)}")
                
                db.close()
                
                logger.info(f"📊 Fallback цикл завершен: проверено {checked_count} каналов, пропущено {skipped_count}")
                
                # Wait before next check - check every 15 seconds for better responsiveness
                logger.info("⏳ Fallback: ожидаю 15 секунд до следующей проверки каналов...")
                await asyncio.sleep(15)
                
            except Exception as e:
                logger.error(f"Error in fallback monitoring: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                await asyncio.sleep(15)
    
    async def check_channel_for_new_posts(self, db: Session, channel: SourceChannel):
        """Check a specific channel for new posts."""
        now = datetime.now(timezone.utc)
        
        # Check if it's time to check this channel (respecting interval)
        if channel.last_checked:
            time_since_last_check = (now - channel.last_checked).total_seconds()
            if time_since_last_check < channel.check_interval:
                logger.info(f"⏭️ Пропускаю {channel.channel_name} - проверен {time_since_last_check:.0f}с назад (интервал: {channel.check_interval}с)")
                return
        
        logger.info(f"🔍 Начинаю активный парсинг канала: {channel.channel_name} ({channel.channel_id})")
        logger.info(f"📅 Время начала парсинга: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info(f"📨 Последний обработанный message ID: {channel.last_message_id or 'Нет'}")
        logger.info(f"⏰ Последняя проверка: {channel.last_checked.strftime('%Y-%m-%d %H:%M:%S UTC') if channel.last_checked else 'Никогда'}")
        logger.info(f"⚙️ Интервал проверки: {channel.check_interval} секунд")
        
        try:
            # Get latest messages from the channel
            # Note: This is a simplified implementation
            # In a real scenario, you'd need to use Telegram Client API (telethon)
            # to read messages from channels where the bot is not an admin
            
            logger.info(f"📥 Получаю сообщения из канала (лимит: 10, offset_id: {channel.last_message_id or 0})...")
            logger.info(f"🔧 Проверяю telegram_service.client: {telegram_service.client is not None}")
            if telegram_service.client:
                try:
                    connected = telegram_service._is_client_connected()
                    logger.info(f"🔧 Client connected: {connected}")
                except Exception as e:
                    logger.info(f"🔧 Client connection check error: {e}")
            
            messages = await telegram_service.get_latest_messages(
                channel.channel_id,
                limit=10,
                offset_id=channel.last_message_id or 0
            )
            logger.info(f"📥 Получено {len(messages) if messages else 0} сообщений от telegram_service")
            
            if not messages:
                logger.info(f"❌ Новых сообщений в канале {channel.channel_name} не найдено")
                crud.update_source_channel_last_checked(db, channel.id)
                return
            
            logger.info(f"✅ Найдено {len(messages)} сообщений в канале {channel.channel_name}")
            logger.info(f"📊 Начинаю анализ сообщений...")
            
            new_posts_count = 0
            latest_message_id = channel.last_message_id or 0
            
            for i, message in enumerate(messages, 1):
                message_id = message.get('message_id', 0)
                message_text = message.get('text', '')
                message_date = message.get('date', 'Неизвестно')
                has_media = bool(message.get('media'))
                
                # Truncate text for logging
                display_text = message_text[:100] + '...' if len(message_text) > 100 else message_text
                
                logger.info(f"📝 [{i}/{len(messages)}] Обрабатываю сообщение ID: {message_id}")
                logger.info(f"📅 Дата сообщения: {message_date}")
                logger.info(f"📄 Текст: {display_text or 'Нет текста'}")
                logger.info(f"🖼️ Медиа: {'Да' if has_media else 'Нет'}")
                
                if message_id > (channel.last_message_id or 0):
                    # Check if message has content (text or media)
                    if not message_text.strip() and not has_media:
                        logger.info(f"⏭️ Пропускаю сообщение {message_id} - нет текста и медиафайлов")
                        latest_message_id = max(latest_message_id, message_id)
                        continue
                    
                    # Check if we already have this post
                    existing_post = crud.get_post_by_source_message(db, channel.id, message_id)
                    if not existing_post:
                        # Create new post
                        post_data = {
                            'source_channel_id': channel.id,
                            'original_message_id': message_id,
                            'original_text': message_text,
                            'original_media': message.get('media', None)
                        }
                        
                        new_post = crud.create_post(db, PostCreate(**post_data))
                        new_posts_count += 1
                        logger.info(f"✅ Создан новый пост ID: {new_post.id} из сообщения {message_id}")
                        logger.info(f"📊 Длина текста: {len(message_text)} символов")
                    else:
                        logger.info(f"⚠️ Сообщение {message_id} уже существует как пост {existing_post.id}")
                    
                    latest_message_id = max(latest_message_id, message_id)
                else:
                    logger.info(f"⏭️ Сообщение {message_id} не новее последнего обработанного {channel.last_message_id or 0}")
                
                logger.info(f"{'─' * 50}")  # Separator between messages
            
            # Update channel's last checked time and message ID
            crud.update_source_channel_last_checked(db, channel.id, latest_message_id)
            
            # Final summary
            logger.info(f"{'=' * 60}")
            logger.info(f"🏁 Завершен парсинг канала: {channel.channel_name}")
            logger.info(f"📊 Статистика:")
            logger.info(f"   • Всего проанализировано сообщений: {len(messages)}")
            logger.info(f"   • Создано новых постов: {new_posts_count}")
            logger.info(f"   • Последний message ID: {latest_message_id}")
            logger.info(f"   • Время завершения: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
            
            if new_posts_count > 0:
                logger.info(f"✅ Успешно найдено {new_posts_count} новых постов в {channel.channel_name}")
            else:
                logger.info(f"ℹ️ Новых постов в канале {channel.channel_name} не найдено")
            
            logger.info(f"{'=' * 60}")
            
        except Exception as e:
            logger.error(f"Error checking channel {channel.channel_name}: {str(e)}")
            # Still update last_checked to avoid getting stuck
            crud.update_source_channel_last_checked(db, channel.id)
    
    async def process_posts(self):
        """Process pending posts with OpenRouter."""
        logger.info("Post processing loop started")
        
        while self.running:
            try:
                db = SessionLocal()
                
                # Get pending posts that haven't been processed yet
                pending_posts = db.query(Post).filter(
                    Post.status == PostStatus.PENDING,
                    Post.processed_at.is_(None)
                ).limit(5).all()
                
                for post in pending_posts:
                    try:
                        await self.process_single_post(db, post)
                    except Exception as e:
                        logger.error(f"Error processing post {post.id}: {str(e)}")
                
                db.close()
                
                # Wait before processing more posts
                await asyncio.sleep(10)
                
            except Exception as e:
                logger.error(f"Error in post processing loop: {str(e)}")
                await asyncio.sleep(30)
    
    async def process_single_post_with_new_session(self, post_id: int):
        """Process a single post with OpenRouter using a new database session."""
        db = SessionLocal()
        try:
            # Get the post from database
            post = crud.get_post(db, post_id)
            if not post:
                logger.error(f"❌ Пост {post_id} не найден в базе данных")
                return
            
            await self.process_single_post(db, post)
        finally:
            db.close()
    
    async def process_single_post(self, db: Session, post: Post):
        """Process a single post with OpenRouter."""
        # Check if post has content (text or media)
        has_text = post.original_text and post.original_text.strip()
        has_media = post.original_media is not None
        
        if not has_text and not has_media:
            logger.info(f"⚠️ Пост {post.id} не содержит текста и медиафайлов для обработки")
            return
        
        # Skip processing if post has only media without text (media-only posts don't need text processing)
        if not has_text:
            logger.info(f"📷 Пост {post.id} содержит только медиа, пропускаю обработку текста")
            # Mark as processed so it doesn't get picked up again for text processing
            post.processed_at = datetime.now(timezone.utc)
            db.commit()
            return
        
        # Get source channel info for context
        source_channel = None
        channel_name = "Frontend Created Post"
        if post.source_channel_id:
            source_channel = crud.get_source_channel(db, post.source_channel_id)
            channel_name = source_channel.channel_name if source_channel else "Неизвестный канал"
        
        logger.info(f"🤖 Начинаю обработку поста {post.id} с помощью OpenRouter")
        logger.info(f"📍 Источник: {channel_name}")
        logger.info(f"📝 Длина оригинального текста: {len(post.original_text)} символов")
        logger.info(f"📅 Время начала обработки: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        try:
            context = f"Source: {channel_name}" if source_channel else None
            
            # Rewrite text using OpenRouter
            processed_text = await openrouter_service.rewrite_text(
                post.original_text,
                context=context
            )
            
            if processed_text:
                # Update post with processed text
                post.processed_text = processed_text
                post.processed_at = datetime.now(timezone.utc)
                db.commit()
                
                logger.info(f"✅ Пост {post.id} успешно обработан")
                logger.info(f"📊 Длина обработанного текста: {len(processed_text)} символов")
                logger.info(f"⏱️ Время завершения: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
            else:
                logger.warning(f"❌ Не удалось обработать пост {post.id} - OpenRouter не вернул текст")
                
        except Exception as e:
            logger.error(f"💥 Ошибка при обработке поста {post.id}: {str(e)}")
    
    async def publish_posts(self):
        """Publish scheduled posts and posts marked for immediate publishing."""
        logger.info("Post publishing loop started (scheduled and immediate publishing)")
        
        while self.running:
            try:
                db = SessionLocal()
                
                # Get scheduled posts that are ready to be published
                scheduled_posts = crud.get_scheduled_posts_ready_to_publish(db, limit=5)
                
                # Get posts marked for immediate publishing (status = "publishing")
                immediate_posts = db.query(Post).filter(
                    Post.status == PostStatus.PUBLISHING
                ).limit(5).all()
                
                # Publish scheduled posts that are ready
                for post in scheduled_posts:
                    try:
                        logger.info(f"📅 Publishing scheduled post {post.id} (scheduled for {post.scheduled_at})")
                        await self.publish_single_post(db, post)
                    except Exception as e:
                        logger.error(f"Error publishing scheduled post {post.id}: {str(e)}")
                
                # Publish posts marked for immediate publishing
                for post in immediate_posts:
                    try:
                        logger.info(f"🚀 Publishing immediate post {post.id} (manual publish request)")
                        await self.publish_single_post(db, post)
                    except Exception as e:
                        logger.error(f"Error publishing immediate post {post.id}: {str(e)}")
                
                db.close()
                
                # Wait before checking for more posts
                await asyncio.sleep(15)
                
            except Exception as e:
                logger.error(f"Error in post publishing loop: {str(e)}")
                await asyncio.sleep(30)
    
    async def publish_single_post(self, db: Session, post: Post):
        """Publish a single post to its target channel."""
        if not post.target_channel_id:
            logger.warning(f"⚠️ У поста {post.id} не указан целевой канал")
            return
        
        target_channel = crud.get_target_channel(db, post.target_channel_id)
        if not target_channel:
            logger.error(f"❌ Целевой канал {post.target_channel_id} не найден для поста {post.id}")
            return
        
        # Use processed text if available, otherwise use original
        text_to_publish = post.processed_text or post.original_text
        
        if not text_to_publish:
            logger.warning(f"⚠️ У поста {post.id} нет текста для публикации")
            return
        
        # Fix escaped newlines and other escape sequences
        # Replace escaped sequences with actual characters
        text_to_publish = text_to_publish.replace('\\n', '\n').replace('\\t', '\t')
        
        logger.info(f"📤 Начинаю публикацию поста {post.id} в канал {target_channel.channel_name}")
        logger.info(f"📍 Целевой канал: {target_channel.channel_name} ({target_channel.channel_id})")
        logger.info(f"📝 Тип текста: {'Обработанный' if post.processed_text else 'Оригинальный'}")
        logger.info(f"📊 Длина текста: {len(text_to_publish)} символов")
        logger.info(f"🖼️ Медиа: {'Да' if post.original_media else 'Нет'}")
        logger.info(f"📅 Время начала публикации: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        try:
            
            # Check if post has media
            if post.original_media:
                # Handle media posts (photos, videos, documents)
                media_info = post.original_media
                
                # Check if it's a media group
                if media_info.get('type') == 'media_group' and media_info.get('media_list'):
                    # Handle media group (multiple media files)
                    media_list = []
                    for media_item in media_info.get('media_list', []):
                        media_file_path = media_item.get('file_path') or media_item.get('path')
                        if media_file_path and media_item.get('type') in ['photo', 'video']:
                            media_list.append({
                                'type': media_item.get('type'),
                                'url': media_file_path
                            })
                    
                    if media_list:
                        # Send as media group (without caption to avoid length issues)
                        try:
                            message_ids = await telegram_service.send_media_group(
                                target_channel.channel_id,
                                media_list
                            )
                            
                            # Send text as separate message if media group was successful
                            if message_ids and text_to_publish.strip():
                                text_message_id = await telegram_service.send_message(
                                    target_channel.channel_id,
                                    text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                logger.info(f"📝 Отправлен текст отдельным сообщением")
                            
                            message_id = message_ids[0] if message_ids else None
                            if message_id:
                                logger.info(f"📸 Отправлена медиа-группа из {len(media_list)} файлов")
                        except TimedOut as timeout_error:
                            logger.warning(f"⏰ Таймаут при отправке медиа-группы: {str(timeout_error)}")
                            logger.info(f"📤 Медиа-группа возможно была отправлена, но сервер не успел ответить")
                            # При таймауте пост скорее всего отправлен, но мы не получили подтверждение
                            # Используем временный ID для отслеживания
                            import time
                            temp_message_id = int(time.time() * 1000) % 1000000
                            message_id = temp_message_id
                            logger.info(f"📸 Медиа-группа помечена как отправленная с временным ID: {temp_message_id}")
                        except Exception as media_error:
                            logger.error(f"❌ Ошибка при отправке медиа-группы: {str(media_error)}")
                            message_id = None
                    else:
                        # No valid media files in group, send as text
                        logger.warning(f"⚠️ Пост {post.id} содержит медиа-группу, но нет валидных файлов")
                        message_id = await telegram_service.send_message(
                            target_channel.channel_id,
                            text_to_publish,
                            parse_mode=ParseMode.MARKDOWN_V2
                        )
                else:
                    # Handle single media file
                    media_file_path = media_info.get('file_path') or media_info.get('path')
                    
                    if media_file_path and media_info.get('type'):
                        # Use file path directly for local files
                        try:
                            if media_info.get('type') == 'photo':
                                message_id = await telegram_service.send_photo(
                                    target_channel.channel_id,
                                    media_file_path,
                                    caption=text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                if message_id:
                                    logger.info(f"📸 Отправлено фото")
                            elif media_info.get('type') == 'video':
                                message_id = await telegram_service.send_video(
                                    target_channel.channel_id,
                                    media_file_path,
                                    caption=text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                if message_id:
                                    logger.info(f"🎥 Отправлено видео")
                            elif media_info.get('type') == 'document':
                                message_id = await telegram_service.send_document(
                                    target_channel.channel_id,
                                    media_file_path,
                                    caption=text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                if message_id:
                                    logger.info(f"📄 Отправлен документ")
                            else:
                                # Fallback to text message
                                message_id = await telegram_service.send_message(
                                    target_channel.channel_id,
                                    text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                if message_id:
                                    logger.info(f"📝 Отправлен текст (fallback)")
                        except TimedOut as timeout_error:
                            logger.warning(f"⏰ Таймаут при отправке медиа: {str(timeout_error)}")
                            logger.info(f"📤 Медиа возможно было отправлено, но сервер не успел ответить")
                            # При таймауте пост скорее всего отправлен
                            import time
                            temp_message_id = int(time.time() * 1000) % 1000000
                            message_id = temp_message_id
                            logger.info(f"📸 Медиа помечено как отправленное с временным ID: {temp_message_id}")
                        except Exception as media_error:
                            logger.error(f"❌ Ошибка при отправке медиа: {str(media_error)}")
                            message_id = None
                    else:
                        # No valid media file, send as text
                        logger.warning(f"⚠️ Пост {post.id} содержит медиа, но путь к файлу не найден")
                        message_id = await telegram_service.send_message(
                            target_channel.channel_id,
                            text_to_publish,
                            parse_mode=ParseMode.MARKDOWN_V2
                        )
            else:
                # Text-only post
                try:
                    message_id = await telegram_service.send_message(
                        target_channel.channel_id,
                        text_to_publish,
                        parse_mode=ParseMode.MARKDOWN_V2  # Enable Markdown formatting
                    )
                    if message_id:
                        logger.info(f"📝 Отправлен текст")
                except TimedOut as timeout_error:
                    logger.warning(f"⏰ Таймаут при отправке текста: {str(timeout_error)}")
                    logger.info(f"📤 Текст возможно был отправлен, но сервер не успел ответить")
                    # При таймауте пост скорее всего отправлен
                    import time
                    temp_message_id = int(time.time() * 1000) % 1000000
                    message_id = temp_message_id
                    logger.info(f"📝 Текст помечен как отправленный с временным ID: {temp_message_id}")
                except Exception as text_error:
                    logger.error(f"❌ Ошибка при отправке текста: {str(text_error)}")
                    message_id = None
            
            if message_id:
                # Mark post as published
                crud.mark_post_published(db, post.id, message_id)
                logger.info(f"✅ Пост {post.id} успешно опубликован")
                logger.info(f"📨 ID сообщения в канале: {message_id}")
                logger.info(f"⏱️ Время завершения публикации: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
                logger.info(f"🎉 Публикация завершена успешно!")
            else:
                logger.error(f"❌ Не удалось опубликовать пост {post.id} - Telegram API не вернул ID сообщения")
                
        except Exception as e:
            logger.error(f"💥 Ошибка при публикации поста {post.id}: {str(e)}")


async def main():
    """Main worker function with database-controlled lifecycle."""
    logger.info("🚀 Worker main() function started - ENTRY POINT")
    logger.info("Worker process started")
    
    while True:
        try:
            # Check if worker should run
            logger.info("🔍 Checking worker status in database...")
            db = SessionLocal()
            worker_status = crud.get_or_create_worker_status(db)
            logger.info(f"📊 Worker status: should_run={worker_status.should_run}, is_running={worker_status.is_running}")
            
            if worker_status.should_run:
                logger.info("Starting worker monitoring...")
                monitor = ChannelMonitor()
                
                try:
                    await monitor.start()
                except Exception as e:
                    logger.error(f"Worker error: {str(e)}")
                finally:
                    await monitor.stop()
                    logger.info("Worker monitoring stopped")
            else:
                logger.info("Worker is not set to run, waiting...")
                # Update status to show worker is not running
                crud.update_worker_status(db, is_running=False)
            
            db.close()
            
            # Wait before checking again
            await asyncio.sleep(10)
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {str(e)}")
            await asyncio.sleep(30)
    
    logger.info("Worker process stopped")


if __name__ == "__main__":
    print("🔧 DEBUG: __main__ block reached - about to run main()")
    logger.info("🔧 DEBUG: __main__ block reached - about to run main()")
    asyncio.run(main())