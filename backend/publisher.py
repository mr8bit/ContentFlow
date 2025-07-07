import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Post, PostStatus
import crud
from telegram_service import telegram_service
from openrouter_service import openrouter_service
from telegram.constants import ParseMode
from telegram.error import TimedOut

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PostPublisher:
    def __init__(self):
        self.running = False
        self.tasks = set()
        self.db = SessionLocal()
    
    async def start(self):
        """Start the post publisher worker with database control."""
        logger.info("Starting post publisher worker...")
        
        # Set running flag to True
        self.running = True
        
        # Mark publisher as running in database
        crud.update_publisher_status(self.db, is_running=True)
        
        # Start database status checker
        status_task = asyncio.create_task(self.check_database_status())
        self.tasks.add(status_task)
        
        # Start post processing loop
        processor_task = asyncio.create_task(self.process_posts())
        self.tasks.add(processor_task)
        
        # Start publisher loop
        publisher_task = asyncio.create_task(self.publish_posts())
        self.tasks.add(publisher_task)
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(self.send_heartbeat())
        self.tasks.add(heartbeat_task)
        
        try:
            await asyncio.gather(*self.tasks)
        except Exception as e:
            logger.error(f"Publisher error: {str(e)}")
        finally:
            self.running = False
            crud.update_publisher_status(self.db, is_running=False)
            self.db.close()
    
    async def stop(self):
        """Stop the post publisher worker."""
        logger.info("Stopping post publisher worker...")
        self.running = False
        
        # Mark publisher as stopped in database
        crud.update_publisher_status(self.db, is_running=False)
        
        for task in self.tasks:
            task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.db.close()
    
    async def check_database_status(self):
        """Check database for should_run flag and stop if needed."""
        while True:
            try:
                publisher_status = crud.get_publisher_status(self.db)
                if publisher_status and not publisher_status.should_run:
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
                crud.update_publisher_status(self.db, heartbeat=True)
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            except Exception as e:
                logger.error(f"Error sending heartbeat: {str(e)}")
                await asyncio.sleep(30)
    
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
                            # Convert relative path to absolute path for Docker container
                            if media_file_path.startswith('./media/'):
                                absolute_path = media_file_path.replace('./media/', '/app/media/')
                            elif media_file_path.startswith('media/'):
                                absolute_path = f'/app/{media_file_path}'
                            else:
                                absolute_path = media_file_path
                            
                            # Debug logging
                            import os
                            logger.info(f"📁 Media file path: {media_file_path} -> {absolute_path}")
                            logger.info(f"📂 File exists: {os.path.exists(absolute_path)}")
                            if os.path.exists(absolute_path):
                                logger.info(f"📊 File size: {os.path.getsize(absolute_path)} bytes")
                            
                            media_list.append({
                                'type': media_item.get('type'),
                                'url': absolute_path
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
                        # Convert relative path to absolute path for Docker container
                        if media_file_path.startswith('./media/'):
                            absolute_path = media_file_path.replace('./media/', '/app/media/')
                        elif media_file_path.startswith('media/'):
                            absolute_path = f'/app/{media_file_path}'
                        else:
                            absolute_path = media_file_path
                        
                        # Use absolute file path for local files
                        try:
                            if media_info.get('type') == 'photo':
                                message_id = await telegram_service.send_photo(
                                    target_channel.channel_id,
                                    absolute_path,
                                    caption=text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                if message_id:
                                    logger.info(f"📸 Отправлено фото")
                            elif media_info.get('type') == 'video':
                                message_id = await telegram_service.send_video(
                                    target_channel.channel_id,
                                    absolute_path,
                                    caption=text_to_publish,
                                    parse_mode=ParseMode.MARKDOWN_V2
                                )
                                if message_id:
                                    logger.info(f"🎥 Отправлено видео")
                            elif media_info.get('type') == 'document':
                                message_id = await telegram_service.send_document(
                                    target_channel.channel_id,
                                    absolute_path,
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
                        logger.warning(f"⚠️ Пост {post.id} содержит медиа, но путь к файлу не найден: {media_file_path}")
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
    """Main publisher function with database-controlled lifecycle."""
    logger.info("🚀 Publisher main() function started - ENTRY POINT")
    logger.info("Publisher process started")
    
    while True:
        try:
            # Check if publisher should run
            logger.info("🔍 Checking publisher status in database...")
            db = SessionLocal()
            publisher_status = crud.get_or_create_publisher_status(db)
            logger.info(f"📊 Publisher status: should_run={publisher_status.should_run}, is_running={publisher_status.is_running}")
            
            if publisher_status.should_run:
                logger.info("Starting publisher monitoring...")
                monitor = PostPublisher()
                
                try:
                    await monitor.start()
                except Exception as e:
                    logger.error(f"Publisher error: {str(e)}")
                finally:
                    await monitor.stop()
                    logger.info("Publisher monitoring stopped")
            else:
                logger.info("Publisher is not set to run, waiting...")
                # Update status to show publisher is not running
                crud.update_publisher_status(db, is_running=False)
            
            db.close()
            
            # Wait before checking again
            await asyncio.sleep(10)
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {str(e)}")
            await asyncio.sleep(30)
    
    logger.info("Publisher process stopped")


if __name__ == "__main__":
    print("🔧 DEBUG: __main__ block reached - about to run main()")
    logger.info("🔧 DEBUG: __main__ block reached - about to run main()")
    asyncio.run(main())