import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Post, PostStatus
from services.llm_classifier import LLMClassifier
from config import settings
import crud

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

class LLMWorker:
    """Worker for processing posts with LLM classification"""
    
    def __init__(self, check_interval: int = 30):
        self.check_interval = check_interval
        self.running = False
        self.classifier = None
        self.start_time = None
        self.processed_posts_count = 0
        self.failed_posts_count = 0
        logger.info(f"🔧 LLM Worker initialized with check_interval={check_interval}s")
        logger.info(f"📊 Worker stats: processed=0, failed=0")
    
    def _get_classifier(self, db: Session) -> Optional[LLMClassifier]:
        """Get LLM classifier with API key from database"""
        logger.debug("🔑 Attempting to get LLM classifier from database")
        try:
            # Get OpenRouter API key from database
            openrouter_key_setting = crud.get_setting(db, "openrouter_api_key")
            if not openrouter_key_setting:
                logger.warning("❌ OpenRouter API key setting not found in database")
                return None
            
            if not openrouter_key_setting.value or not openrouter_key_setting.value.strip():
                logger.warning("❌ OpenRouter API key is empty or contains only whitespace")
                return None
            
            # Get model from settings or use default
            model = settings.openrouter_model or "anthropic/claude-3-haiku"
            logger.info(f"🤖 Creating LLM classifier with model: {model}")
            logger.info(f"🔑 API key length: {len(openrouter_key_setting.value)} characters")
            
            classifier = LLMClassifier(openrouter_key_setting.value, model)
            logger.info("✅ LLM classifier successfully created")
            return classifier
        except Exception as e:
            logger.error(f"💥 Error getting LLM classifier: {str(e)}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            return None
    
    async def start(self):
        """Start the LLM worker"""
        self.running = True
        self.start_time = datetime.now(timezone.utc)
        logger.info(f"🚀 LLM Worker started at {self.start_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info(f"⏱️ Check interval: {self.check_interval} seconds")
        
        cycle_count = 0
        while self.running:
            cycle_count += 1
            cycle_start_time = time.time()
            
            try:
                logger.debug(f"🔄 Starting processing cycle #{cycle_count}")
                await self.process_pending_posts()
                
                cycle_duration = time.time() - cycle_start_time
                logger.debug(f"✅ Cycle #{cycle_count} completed in {cycle_duration:.2f}s")
                
                # Log stats every 10 cycles
                if cycle_count % 10 == 0:
                    uptime = datetime.now(timezone.utc) - self.start_time
                    logger.info(f"📊 Worker stats after {cycle_count} cycles:")
                    logger.info(f"   ⏰ Uptime: {uptime}")
                    logger.info(f"   ✅ Processed posts: {self.processed_posts_count}")
                    logger.info(f"   ❌ Failed posts: {self.failed_posts_count}")
                
                await asyncio.sleep(10)  # Check every 10 seconds
            except Exception as e:
                self.failed_posts_count += 1
                logger.error(f"💥 Error in LLM worker cycle #{cycle_count}: {str(e)}")
                logger.error(f"🔍 Exception type: {type(e).__name__}")
                logger.info(f"⏳ Waiting 30 seconds before retry...")
                await asyncio.sleep(30)  # Wait longer on error
    
    def stop(self):
        """Stop the LLM worker"""
        self.running = False
        stop_time = datetime.now(timezone.utc)
        
        if self.start_time:
            total_uptime = stop_time - self.start_time
            logger.info(f"🛑 LLM Worker stopped at {stop_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            logger.info(f"📊 Final worker statistics:")
            logger.info(f"   ⏰ Total uptime: {total_uptime}")
            logger.info(f"   ✅ Total processed posts: {self.processed_posts_count}")
            logger.info(f"   ❌ Total failed posts: {self.failed_posts_count}")
            if self.processed_posts_count > 0:
                success_rate = (self.processed_posts_count / (self.processed_posts_count + self.failed_posts_count)) * 100
                logger.info(f"   📈 Success rate: {success_rate:.1f}%")
        else:
            logger.info("🛑 LLM Worker stopped")
    
    async def process_pending_posts(self):
        """Process all pending posts"""
        db = SessionLocal()
        process_start_time = time.time()
        
        try:
            logger.debug("🔍 Starting pending posts processing cycle")
            
            # Check database connection
            if not self.check_database_status(db):
                logger.warning("⚠️ Database not ready, skipping this cycle")
                return
            
            # Send heartbeat
            await self.send_heartbeat(db)
            
            # Get classifier
            if not self.classifier:
                classifier_start = time.time()
                self.classifier = self._get_classifier(db)
                classifier_duration = time.time() - classifier_start
                
                if not self.classifier:
                    logger.warning("⚠️ LLM classifier not available, skipping this cycle")
                    return
                logger.debug(f"🤖 Classifier obtained in {classifier_duration:.3f}s")
            
            # Process posts
            posts_start = time.time()
            await self.process_posts(db)
            posts_duration = time.time() - posts_start
            
            total_duration = time.time() - process_start_time
            logger.debug(f"📝 Posts processing completed in {posts_duration:.3f}s")
            logger.debug(f"⏱️ Total cycle duration: {total_duration:.3f}s")
            
        except Exception as e:
            logger.error(f"💥 Error in process_pending_posts: {str(e)}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            raise
        finally:
             db.close()
             logger.debug("🔒 Database session closed")
    
    def check_database_status(self, db: Session) -> bool:
        """Check if database is ready"""
        db_check_start = time.time()
        try:
            logger.debug("🔍 Checking database connectivity...")
            # Simple query to check database connectivity
            from sqlalchemy import text
            result = db.execute(text("SELECT 1"))
            db_check_duration = time.time() - db_check_start
            
            logger.debug(f"✅ Database connectivity check passed in {db_check_duration:.3f}s")
            return True
        except Exception as e:
            db_check_duration = time.time() - db_check_start
            logger.error(f"💥 Database connection error after {db_check_duration:.3f}s: {str(e)}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            return False
    
    async def send_heartbeat(self, db: Session):
        """Send heartbeat to indicate worker is alive"""
        heartbeat_start = time.time()
        try:
            logger.debug("💓 Sending worker heartbeat...")
            # Update worker heartbeat in database or perform other heartbeat logic
            # For now, just log that we're alive
            heartbeat_duration = time.time() - heartbeat_start
            logger.debug(f"💓 Heartbeat sent successfully in {heartbeat_duration:.3f}s")
        except Exception as e:
            heartbeat_duration = time.time() - heartbeat_start
            logger.error(f"💥 Error sending heartbeat after {heartbeat_duration:.3f}s: {str(e)}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
    
    async def process_posts(self, db: Session):
        """Process posts that need LLM classification and rewriting"""
        try:
            # Get posts that are scraped but not yet classified
            posts = db.query(Post).filter(
                Post.status == PostStatus.SCRAPED,
                Post.llm_classification_confidence.is_(None)
            ).limit(5).all()  # Process 5 posts at a time
            
            if not posts:
                logger.debug("📭 No pending posts found for classification")
            else:
                logger.info(f"📝 Found {len(posts)} posts for LLM classification")
                
                for i, post in enumerate(posts, 1):
                    post_start_time = time.time()
                    try:
                        logger.debug(f"🔄 Processing post {i}/{len(posts)} (ID: {post.id})")
                        await self.process_single_post_with_new_session(post.id)
                        
                        post_duration = time.time() - post_start_time
                        self.processed_posts_count += 1
                        logger.info(f"✅ Post {post.id} processed successfully in {post_duration:.2f}s")
                        
                    except Exception as e:
                        post_duration = time.time() - post_start_time
                        self.failed_posts_count += 1
                        logger.error(f"❌ Error processing post {post.id} after {post_duration:.2f}s: {str(e)}")
                        logger.error(f"🔍 Exception type: {type(e).__name__}")
                        
                        # Mark post as failed or waiting for manual review
                        try:
                            post.status = PostStatus.WAITING
                            db.commit()
                            logger.info(f"🔄 Post {post.id} marked as WAITING for manual review")
                        except Exception as commit_error:
                            logger.error(f"💥 Failed to update post {post.id} status: {commit_error}")
                            db.rollback()
                
                logger.info(f"📊 Batch processing completed: {self.processed_posts_count} total processed, {self.failed_posts_count} total failed")
            
            # Get processed posts that need rewriting with target channel prompt
            # Only get posts that haven't been rewritten yet (processed_text is None or empty)
            from sqlalchemy import or_
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
                    try:
                        await self.rewrite_post_for_target_channel(db, post)
                    except Exception as e:
                        logger.error(f"Error rewriting post {post.id}: {str(e)}")
            else:
                logger.debug("📭 No processed posts found for rewriting")
                
        except Exception as e:
            logger.error(f"💥 Error in process_posts: {str(e)}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            raise
    
    async def rewrite_post_for_target_channel(self, db: Session, post: Post):
        """Rewrite post content for target channel using LLM"""
        try:
            logger.info(f"📝 Starting rewrite for post {post.id} (target_channel_id: {post.target_channel_id})")
            
            # Get target channel with rewrite_prompt from database
            target_channel = crud.get_target_channel(db, post.target_channel_id)
            if not target_channel:
                logger.warning(f"⚠️ Target channel {post.target_channel_id} not found")
                return
                
            if not target_channel.rewrite_prompt or not target_channel.rewrite_prompt.strip():
                logger.info(f"📝 Target channel {target_channel.channel_name} has no rewrite_prompt, skipping post {post.id}")
                return
            
            # Check if post has original text
            if not post.original_text or not post.original_text.strip():
                logger.warning(f"⚠️ Post {post.id} has no original text for rewriting")
                return
            
            logger.info(f"🔄 Rewriting post {post.id} for channel {target_channel.channel_name}")
            logger.info(f"📝 Original text length: {len(post.original_text)} characters")
            logger.info(f"🎯 Using channel prompt: {target_channel.rewrite_prompt[:100]}...")
            
            # Format the rewrite prompt with original text
            formatted_prompt = target_channel.rewrite_prompt.format(original_text=post.original_text)
            
            # Use OpenRouter service to rewrite the text
            import sys
            import os
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from openrouter_service import openrouter_service
            rewritten_text = await openrouter_service.rewrite_text_with_custom_prompt(
                post.original_text,
                custom_prompt=formatted_prompt
            )
            
            if rewritten_text:
                post.processed_text = rewritten_text
                post.processed_at = datetime.now(timezone.utc)
                db.commit()
                logger.info(f"✅ Post {post.id} rewritten successfully for channel {target_channel.channel_name}")
                logger.info(f"📊 Rewritten text length: {len(rewritten_text)} characters")
            else:
                logger.warning(f"⚠️ Failed to rewrite post {post.id} - OpenRouter returned no text")
                
        except KeyError as e:
            logger.error(f"💥 Error in rewrite prompt template for post {post.id}: missing field {str(e)}")
        except Exception as e:
            logger.error(f"💥 Error rewriting post {post.id}: {str(e)}")
            db.rollback()
            raise
    
    async def process_single_post_with_new_session(self, post_id: int):
        """Process a single post with a new database session"""
        db = SessionLocal()
        try:
            post = db.query(Post).filter(Post.id == post_id).first()
            if not post:
                logger.warning(f"⚠️ Post {post_id} not found in database")
                return
            
            await self.process_single_post(db, post)
            
        finally:
            db.close()
    
    async def process_single_post(self, db: Session, post: Post):
        """Process a single post with LLM classification"""
        classification_start_time = time.time()
        
        logger.info(f"🔍 Starting LLM classification for post {post.id}")
        
        # Use correct field names from the Post model
        post_text = post.original_text or post.processed_text or ""
        logger.debug(f"📄 Content length: {len(post_text)} characters")
        logger.debug(f"📝 Post text preview: '{post_text[:100]}{'...' if len(post_text) > 100 else ''}'")
        
        try:
            # Classify the post using original or processed text
            logger.debug(f"🤖 Sending post {post.id} to LLM classifier...")
            classification_result = await self.classifier.process_post_classification(db, post)
            
            classification_duration = time.time() - classification_start_time
            logger.debug(f"⏱️ LLM classification completed in {classification_duration:.2f}s")
            
            if classification_result:
                # Classification was successfully processed by LLMClassifier.process_post_classification
                # which updates the post status and target_channel_id
                logger.info(f"✅ Post {post.id} classification completed successfully")
                
                # Refresh post to get updated data
                db.refresh(post)
                logger.info(f"🎯 Post {post.id} status: {post.status}")
                if post.target_channel_id:
                    logger.info(f"📊 Target Channel ID: {post.target_channel_id}")
                if post.llm_classification_confidence:
                    logger.info(f"🎲 Confidence: {post.llm_classification_confidence}%")
            else:
                logger.warning(f"⚠️ Classification processing failed for post {post.id}")
                post.status = PostStatus.WAITING
                logger.info(f"🔄 Post {post.id} marked as WAITING for manual review")
            
            # Commit changes
            commit_start = time.time()
            db.commit()
            commit_duration = time.time() - commit_start
            logger.debug(f"💾 Database commit completed in {commit_duration:.3f}s")
            
            total_duration = time.time() - classification_start_time
            logger.info(f"🏁 Post {post.id} processing completed in {total_duration:.2f}s")
            
        except Exception as e:
            error_duration = time.time() - classification_start_time
            logger.error(f"💥 Error classifying post {post.id} after {error_duration:.2f}s: {str(e)}")
            logger.error(f"🔍 Exception type: {type(e).__name__}")
            logger.error(f"📝 Post details - Text length: {len(post_text)}")
            
            try:
                db.rollback()
                logger.debug(f"🔄 Database rollback completed for post {post.id}")
            except Exception as rollback_error:
                logger.error(f"💥 Failed to rollback transaction for post {post.id}: {rollback_error}")
            
            raise

# Global worker instance
llm_worker = LLMWorker()

async def start_llm_worker():
    """Start the LLM worker"""
    await llm_worker.start()

def stop_llm_worker():
    """Stop the LLM worker"""
    llm_worker.stop()

async def main():
    """Main function to run the LLM worker"""
    logger.info("🚀 Starting LLM Worker main process...")
    logger.info(f"🐍 Python version: {__import__('sys').version}")
    logger.info(f"📁 Working directory: {__import__('os').getcwd()}")
    
    worker = LLMWorker()
    
    try:
        logger.info("🔄 Initializing worker startup sequence...")
        await worker.start()
    except KeyboardInterrupt:
        logger.info("⚠️ Received keyboard interrupt signal (Ctrl+C)")
        logger.info("🛑 Initiating graceful shutdown...")
    except Exception as e:
        logger.error(f"💥 Unexpected error in main process: {str(e)}")
        logger.error(f"🔍 Exception type: {type(e).__name__}")
        raise
    finally:
        logger.info("🧹 Cleaning up worker resources...")
        worker.stop()
        logger.info("✅ LLM Worker main process completed")

if __name__ == "__main__":
    logger.info("🎬 LLM Worker script started directly")
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"💥 Fatal error in script execution: {str(e)}")
        logger.error(f"🔍 Exception type: {type(e).__name__}")
        exit(1)
    logger.info("🏁 LLM Worker script execution completed")