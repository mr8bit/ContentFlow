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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ChannelScrapper:
    def __init__(self):
        self.running = False
        self.tasks = set()
        self.scraper = telegram_scraper
        self.db = SessionLocal()
        self.monitored_channels = set()  # Track currently monitored channels
        self.continuous_task = None  # Track the main monitoring task
    
    async def start(self):
        """Start the channel scrapping worker with database control."""
        logger.info("Starting channel scrapper worker...")
        
        # Set running flag to True - CRITICAL!
        self.running = True
        
        # Mark scrapper as running in database
        crud.update_scrapper_status(self.db, is_running=True)
        
        # Initialize the scraper
        if not await self.scraper.initialize():
            logger.error("Failed to initialize Telegram scraper")
            crud.update_scrapper_status(self.db, is_running=False)
            return
        
        # Enable media downloading
        self.scraper.media_enabled = True
        logger.info("✅ Media downloading enabled for scraper")
        
        # Start database status checker
        status_task = asyncio.create_task(self.check_database_status())
        self.tasks.add(status_task)
        
        # Start main monitoring loop
        logger.info("🔧 DEBUG: Создаю monitor_task")
        monitor_task = asyncio.create_task(self.monitor_channels())
        self.tasks.add(monitor_task)
        logger.info(f"🔧 DEBUG: monitor_task создана: {monitor_task}")
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(self.send_heartbeat())
        self.tasks.add(heartbeat_task)
        
        # Start channel reload task
        reload_task = asyncio.create_task(self.reload_channels_periodically())
        self.tasks.add(reload_task)
        
        try:
            await asyncio.gather(*self.tasks)
        except Exception as e:
            logger.error(f"Scrapper error: {str(e)}")
        finally:
            self.running = False
            crud.update_scrapper_status(self.db, is_running=False)
            self.db.close()
    
    async def stop(self):
        """Stop the channel scrapping worker."""
        logger.info("Stopping channel scrapper worker...")
        self.running = False
        
        # Mark scrapper as stopped in database
        crud.update_scrapper_status(self.db, is_running=False)
        
        await self.scraper.stop_monitoring()
        
        for task in self.tasks:
            task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.db.close()
    
    async def check_database_status(self):
        """Check database for should_run flag and stop if needed."""
        while True:
            try:
                scrapper_status = crud.get_scrapper_status(self.db)
                if scrapper_status and not scrapper_status.should_run:
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
                crud.update_scrapper_status(self.db, heartbeat=True)
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
                # Check for new channels every 30 seconds
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
                await asyncio.sleep(30)
    
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
    
    async def handle_new_message(self, message_data: dict, channel_name: str):
        """Handle new message from TelegramChannelScraper"""
        try:
            logger.info(f"🎯 SCRAPPER CALLBACK TRIGGERED! Processing message {message_data['message_id']} from {channel_name}")
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
            
            db.close()
            
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


async def main():
    """Main scrapper function with database-controlled lifecycle."""
    logger.info("🚀 Scrapper main() function started - ENTRY POINT")
    logger.info("Scrapper process started")
    
    while True:
        try:
            # Check if scrapper should run
            logger.info("🔍 Checking scrapper status in database...")
            db = SessionLocal()
            scrapper_status = crud.get_or_create_scrapper_status(db)
            logger.info(f"📊 Scrapper status: should_run={scrapper_status.should_run}, is_running={scrapper_status.is_running}")
            
            if scrapper_status.should_run:
                logger.info("Starting scrapper monitoring...")
                monitor = ChannelScrapper()
                
                try:
                    await monitor.start()
                except Exception as e:
                    logger.error(f"Scrapper error: {str(e)}")
                finally:
                    await monitor.stop()
                    logger.info("Scrapper monitoring stopped")
            else:
                logger.info("Scrapper is not set to run, waiting...")
                # Update status to show scrapper is not running
                crud.update_scrapper_status(db, is_running=False)
            
            db.close()
            
            # Wait before checking again
            await asyncio.sleep(10)
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {str(e)}")
            await asyncio.sleep(30)
    
    logger.info("Scrapper process stopped")


if __name__ == "__main__":
    print("🔧 DEBUG: __main__ block reached - about to run main()")
    logger.info("🔧 DEBUG: __main__ block reached - about to run main()")
    asyncio.run(main())