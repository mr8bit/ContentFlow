import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import SessionLocal
from models import Post, PostStatus
import crud
from openrouter_service import openrouter_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LLMWorker:
    def __init__(self):
        self.running = False
        self.tasks = set()
        self.db = SessionLocal()
    
    async def start(self):
        """Start the LLM worker with database control."""
        logger.info("Starting LLM worker...")
        
        # Set running flag to True
        self.running = True
        
        # Mark LLM worker as running in database
        crud.update_llm_worker_status(self.db, is_running=True)
        
        # Start database status checker
        status_task = asyncio.create_task(self.check_database_status())
        self.tasks.add(status_task)
        
        # Start post processing loop
        processor_task = asyncio.create_task(self.process_posts())
        self.tasks.add(processor_task)
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(self.send_heartbeat())
        self.tasks.add(heartbeat_task)
        
        try:
            await asyncio.gather(*self.tasks)
        except Exception as e:
            logger.error(f"LLM Worker error: {str(e)}")
        finally:
            self.running = False
            crud.update_llm_worker_status(self.db, is_running=False)
            self.db.close()
    
    async def stop(self):
        """Stop the LLM worker."""
        logger.info("Stopping LLM worker...")
        self.running = False
        
        # Mark LLM worker as stopped in database
        crud.update_llm_worker_status(self.db, is_running=False)
        
        for task in self.tasks:
            task.cancel()
        
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.db.close()
    
    async def check_database_status(self):
        """Check database for should_run flag and stop if needed."""
        while True:
            try:
                llm_worker_status = crud.get_llm_worker_status(self.db)
                if llm_worker_status and not llm_worker_status.should_run:
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
                crud.update_llm_worker_status(self.db, heartbeat=True)
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            except Exception as e:
                logger.error(f"Error sending heartbeat: {str(e)}")
                await asyncio.sleep(30)
    
    async def process_posts(self):
        """Process pending posts with OpenRouter."""
        logger.info("LLM post processing loop started")
        
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
                
                # Get processed posts that need rewriting with target channel prompt
                # Only get posts that haven't been rewritten yet (processed_text is None or empty)
                processed_posts = db.query(Post).filter(
                    Post.status == PostStatus.PROCESSED,
                    Post.target_channel_id.isnot(None),
                    Post.llm_classification_confidence.isnot(None),
                    or_(Post.processed_text.is_(None), Post.processed_text == '')
                ).limit(5).all()
                
                logger.debug(f"🔄 Found {len(processed_posts)} processed posts for rewriting")
                if processed_posts:
                    for post in processed_posts:
                        logger.debug(f"📝 Processing post {post.id} for rewriting (target_channel_id: {post.target_channel_id})")
                else:
                    logger.debug("📭 No processed posts found for rewriting")
                
                for post in processed_posts:
                    try:
                        await self.rewrite_post_for_target_channel(db, post)
                    except Exception as e:
                        logger.error(f"Error rewriting post {post.id}: {str(e)}")
                
                db.close()
                
                # Wait before processing more posts
                await asyncio.sleep(10)
                
            except Exception as e:
                logger.error(f"Error in LLM post processing loop: {str(e)}")
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
    
    async def rewrite_post_for_target_channel(self, db: Session, post: Post):
        """Rewrite a processed post using target channel's rewrite_prompt."""
        # Get target channel info
        target_channel = crud.get_target_channel(db, post.target_channel_id)
        if not target_channel:
            logger.warning(f"⚠️ Целевой канал {post.target_channel_id} не найден для поста {post.id}")
            return
        
        # Check if target channel has rewrite_prompt
        if not target_channel.rewrite_prompt or not target_channel.rewrite_prompt.strip():
            logger.info(f"📝 У целевого канала {target_channel.channel_name} нет промпта для переписывания, пропускаю пост {post.id}")
            return
        
        # Check if post has original text
        if not post.original_text or not post.original_text.strip():
            logger.info(f"⚠️ Пост {post.id} не содержит оригинального текста для переписывания")
            return
        
        logger.info(f"🔄 Начинаю переписывание поста {post.id} для канала {target_channel.channel_name}")
        logger.info(f"📝 Длина оригинального текста: {len(post.original_text)} символов")
        logger.info(f"🎯 Используется промпт канала: {target_channel.rewrite_prompt[:100]}...")
        
        try:
            # Format the rewrite prompt with original text
            formatted_prompt = target_channel.rewrite_prompt.format(original_text=post.original_text)
            
            # Rewrite text using OpenRouter with the formatted prompt
            rewritten_text = await openrouter_service.rewrite_text_with_custom_prompt(
                post.original_text,
                custom_prompt=formatted_prompt
            )
            
            if rewritten_text:
                # Update post with rewritten text
                post.processed_text = rewritten_text
                post.processed_at = datetime.now(timezone.utc)
                post.status = PostStatus.PROCESSED  # Keep status as processed
                db.commit()
                
                logger.info(f"✅ Пост {post.id} успешно переписан для канала {target_channel.channel_name}")
                logger.info(f"📊 Длина переписанного текста: {len(rewritten_text)} символов")
                logger.info(f"⏱️ Время завершения: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
            else:
                logger.warning(f"❌ Не удалось переписать пост {post.id} - OpenRouter не вернул текст")
                
        except KeyError as e:
            logger.error(f"💥 Ошибка в шаблоне промпта для поста {post.id}: отсутствует поле {str(e)}")
        except Exception as e:
            logger.error(f"💥 Ошибка при переписывании поста {post.id}: {str(e)}")


async def main():
    """Main LLM worker function with database-controlled lifecycle."""
    logger.info("🚀 LLM Worker main() function started - ENTRY POINT")
    logger.info("LLM Worker process started")
    
    while True:
        try:
            # Check if LLM worker should run
            logger.info("🔍 Checking LLM worker status in database...")
            db = SessionLocal()
            llm_worker_status = crud.get_or_create_llm_worker_status(db)
            logger.info(f"📊 LLM Worker status: should_run={llm_worker_status.should_run}, is_running={llm_worker_status.is_running}")
            
            if llm_worker_status.should_run:
                logger.info("Starting LLM worker monitoring...")
                worker = LLMWorker()
                
                try:
                    await worker.start()
                except Exception as e:
                    logger.error(f"LLM Worker error: {str(e)}")
                finally:
                    await worker.stop()
                    logger.info("LLM Worker monitoring stopped")
            else:
                logger.info("LLM Worker is not set to run, waiting...")
                # Update status to show LLM worker is not running
                crud.update_llm_worker_status(db, is_running=False)
            
            db.close()
            
            # Wait before checking again
            await asyncio.sleep(10)
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {str(e)}")
            await asyncio.sleep(30)
    
    logger.info("LLM Worker process stopped")


if __name__ == "__main__":
    print("🔧 DEBUG: __main__ block reached - about to run main()")
    logger.info("🔧 DEBUG: __main__ block reached - about to run main()")
    asyncio.run(main())