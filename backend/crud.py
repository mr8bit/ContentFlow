from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from models import User, SourceChannel, TargetChannel, Post, PostStatus, Settings, AIModel, WorkerStatus, ScrapperStatus, PublisherStatus
from schemas import (
    UserCreate, SourceChannelCreate, SourceChannelUpdate,
    TargetChannelCreate, TargetChannelUpdate, PostCreate, PostUpdate,
    SettingCreate, SettingUpdate, AIModelCreate, AIModelUpdate
)
from auth import get_password_hash


# User CRUD
def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Source Channel CRUD
def get_source_channels(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[SourceChannel]:
    query = db.query(SourceChannel)
    if active_only:
        query = query.filter(SourceChannel.is_active == True)
    return query.offset(skip).limit(limit).all()


def get_source_channel(db: Session, channel_id: int) -> Optional[SourceChannel]:
    return db.query(SourceChannel).filter(SourceChannel.id == channel_id).first()


def get_source_channel_by_telegram_id(db: Session, telegram_channel_id: str) -> Optional[SourceChannel]:
    return db.query(SourceChannel).filter(SourceChannel.channel_id == telegram_channel_id).first()


def get_source_channel_by_id(db: Session, channel_identifier: str) -> Optional[SourceChannel]:
    """Get source channel by channel_id or channel_username"""
    return db.query(SourceChannel).filter(
        or_(
            SourceChannel.channel_id == channel_identifier,
            SourceChannel.channel_username == channel_identifier
        )
    ).first()


def create_source_channel(db: Session, channel: SourceChannelCreate) -> SourceChannel:
    db_channel = SourceChannel(**channel.dict())
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel


def update_source_channel(db: Session, channel_id: int, channel_update: SourceChannelUpdate) -> Optional[SourceChannel]:
    db_channel = get_source_channel(db, channel_id)
    if not db_channel:
        return None
    
    update_data = channel_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_channel, field, value)
    
    db.commit()
    db.refresh(db_channel)
    return db_channel


def delete_source_channel(db: Session, channel_id: int) -> bool:
    db_channel = get_source_channel(db, channel_id)
    if not db_channel:
        return False
    
    # First delete all posts associated with this source channel
    db.query(Post).filter(Post.source_channel_id == channel_id).delete()
    
    # Then delete the source channel
    db.delete(db_channel)
    db.commit()
    return True


def update_source_channel_last_checked(db: Session, channel_id: int, last_message_id: int = None) -> Optional[SourceChannel]:
    db_channel = get_source_channel(db, channel_id)
    if not db_channel:
        return None
    
    db_channel.last_checked = datetime.now(timezone.utc)
    if last_message_id is not None:
        db_channel.last_message_id = last_message_id
    
    db.commit()
    db.refresh(db_channel)
    return db_channel


# Target Channel CRUD
def get_target_channels(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[TargetChannel]:
    query = db.query(TargetChannel)
    if active_only:
        query = query.filter(TargetChannel.is_active == True)
    return query.offset(skip).limit(limit).all()


def get_target_channel(db: Session, channel_id: int) -> Optional[TargetChannel]:
    return db.query(TargetChannel).filter(TargetChannel.id == channel_id).first()


def get_target_channel_by_telegram_id(db: Session, telegram_channel_id: str) -> Optional[TargetChannel]:
    return db.query(TargetChannel).filter(TargetChannel.channel_id == telegram_channel_id).first()


def create_target_channel(db: Session, channel: TargetChannelCreate) -> TargetChannel:
    db_channel = TargetChannel(**channel.dict())
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel


def update_target_channel(db: Session, channel_id: int, channel_update: TargetChannelUpdate) -> Optional[TargetChannel]:
    db_channel = get_target_channel(db, channel_id)
    if not db_channel:
        return None
    
    update_data = channel_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_channel, field, value)
    
    db.commit()
    db.refresh(db_channel)
    return db_channel


def delete_target_channel(db: Session, channel_id: int) -> bool:
    db_channel = get_target_channel(db, channel_id)
    if not db_channel:
        return False
    
    db.delete(db_channel)
    db.commit()
    return True


# Post CRUD
def get_posts(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[PostStatus] = None,
    source_channel_id: Optional[int] = None,
    target_channel_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    is_manual: Optional[bool] = None
) -> List[Post]:
    query = db.query(Post).order_by(desc(Post.created_at))
    
    if status:
        query = query.filter(Post.status == status)
    
    if source_channel_id is not None:
        query = query.filter(Post.source_channel_id == source_channel_id)
    
    if target_channel_id is not None:
        query = query.filter(Post.target_channel_id == target_channel_id)
    
    if date_from:
        query = query.filter(Post.created_at >= date_from)
    
    if date_to:
        query = query.filter(Post.created_at <= date_to)
    
    if is_manual is not None:
        query = query.filter(Post.is_manual == is_manual)
    
    return query.offset(skip).limit(limit).all()


def get_post(db: Session, post_id: int) -> Optional[Post]:
    return db.query(Post).filter(Post.id == post_id).first()


def get_post_by_source_message(db: Session, source_channel_id: int, message_id: int) -> Optional[Post]:
    return db.query(Post).filter(
        and_(
            Post.source_channel_id == source_channel_id,
            Post.original_message_id == message_id
        )
    ).first()


def get_post_by_message_id(db: Session, message_id: int, source_channel_id: int) -> Optional[Post]:
    """Get post by message_id and source_channel_id"""
    return db.query(Post).filter(
        and_(
            Post.original_message_id == message_id,
            Post.source_channel_id == source_channel_id
        )
    ).first()


def create_post(db: Session, post: PostCreate) -> Post:
    post_data = post.dict()
    # Set is_manual=False for posts created from Telegram scraper
    post_data['is_manual'] = False
    db_post = Post(**post_data)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def get_or_create_frontend_source_channel(db: Session) -> SourceChannel:
    """Get or create a special source channel for frontend-created posts"""
    frontend_channel = db.query(SourceChannel).filter(SourceChannel.channel_id == "frontend").first()
    if not frontend_channel:
        frontend_channel = SourceChannel(
            channel_id="frontend",
            channel_name="Frontend Created Posts",
            channel_username="frontend",
            is_active=True
        )
        db.add(frontend_channel)
        db.commit()
        db.refresh(frontend_channel)
    return frontend_channel


def create_post_from_frontend(db: Session, post_data: dict, user_id: int) -> Post:
    """Create a new post from frontend with text and media files."""
    from datetime import datetime, timezone
    import json
    
    # Convert media_files list to proper structure matching telegram_scraper_service format
    media_files = post_data.get('media_files')
    if media_files and isinstance(media_files, list):
        if len(media_files) == 1:
            # Single media file - use same format as telegram_scraper_service for single media
            filename = media_files[0]
            # Construct full path to uploaded file
            file_path = f"./media/uploads/{filename}"
            # Determine media type based on file extension
            file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
            if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                media_type = 'photo'
            elif file_ext in ['mp4', 'avi', 'mov', 'mkv', 'webm']:
                media_type = 'video'
            else:
                media_type = 'photo'  # Default to photo
            
            original_media = {
                "type": media_type,
                "file_path": file_path
            }
        else:
            # Multiple media files - use media_group format
            media_list = []
            for filename in media_files:
                # Construct full path to uploaded file
                file_path = f"./media/uploads/{filename}"
                # Determine media type based on file extension
                file_ext = filename.lower().split('.')[-1] if '.' in filename else ''
                if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                    media_type = 'photo'
                elif file_ext in ['mp4', 'avi', 'mov', 'mkv', 'webm']:
                    media_type = 'video'
                else:
                    media_type = 'photo'  # Default to photo
                
                media_list.append({
                    "type": media_type,
                    "file_path": file_path
                })
            
            original_media = {
                "type": "media_group",
                "media_list": media_list
            }
    else:
        original_media = None
    
    db_post = Post(
        source_channel_id=None,  # No source channel for frontend posts
        target_channel_id=post_data.get('target_channel_id'),
        original_message_id=0,  # No original message for frontend posts
        original_text=post_data.get('text'),
        processed_text=post_data.get('text'),  # Initially same as original
        original_media=original_media,
        is_manual=True,  # Mark as manual post from frontend
        status=PostStatus.PENDING,
        created_at=datetime.now(timezone.utc),
        approved_by=user_id  # Set creator as approver for frontend posts
    )
    
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


def update_post(db: Session, post_id: int, post_update: PostUpdate) -> Optional[Post]:
    db_post = get_post(db, post_id)
    if not db_post:
        return None
    
    update_data = post_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_post, field, value)
    
    # Update timestamps based on status
    if 'status' in update_data:
        if update_data['status'] == PostStatus.APPROVED:
            db_post.approved_at = datetime.now(timezone.utc)
        elif update_data['status'] == PostStatus.PUBLISHED:
            db_post.published_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(db_post)
    return db_post


def approve_post(db: Session, post_id: int, user_id: int, target_channel_id: int, admin_notes: Optional[str] = None) -> Optional[Post]:
    db_post = get_post(db, post_id)
    if not db_post:
        return None
    
    db_post.status = PostStatus.APPROVED
    db_post.target_channel_id = target_channel_id
    db_post.approved_by = user_id
    db_post.approved_at = datetime.now(timezone.utc)
    if admin_notes:
        db_post.admin_notes = admin_notes
    
    db.commit()
    db.refresh(db_post)
    return db_post


def schedule_post(db: Session, post_id: int, user_id: int, target_channel_id: int, scheduled_at: datetime, admin_notes: Optional[str] = None) -> Optional[Post]:
    db_post = get_post(db, post_id)
    if not db_post:
        return None
    
    db_post.status = PostStatus.SCHEDULED
    db_post.target_channel_id = target_channel_id
    db_post.approved_by = user_id
    db_post.approved_at = datetime.now(timezone.utc)
    db_post.scheduled_at = scheduled_at
    if admin_notes:
        db_post.admin_notes = admin_notes
    
    db.commit()
    db.refresh(db_post)
    return db_post


def reject_post(db: Session, post_id: int, user_id: int, admin_notes: Optional[str] = None) -> Optional[Post]:
    db_post = get_post(db, post_id)
    if not db_post:
        return None
    
    db_post.status = PostStatus.REJECTED
    db_post.approved_by = user_id
    db_post.approved_at = datetime.now(timezone.utc)
    if admin_notes:
        db_post.admin_notes = admin_notes
    
    db.commit()
    db.refresh(db_post)
    return db_post


def mark_post_published(db: Session, post_id: int, published_message_id: int) -> Optional[Post]:
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"📝 mark_post_published вызвана для поста {post_id} с message_id {published_message_id}")
    
    db_post = get_post(db, post_id)
    if not db_post:
        logger.error(f"❌ Пост {post_id} не найден в базе данных")
        return None
    
    logger.info(f"📊 Текущий статус поста {post_id}: {db_post.status}")
    
    db_post.status = PostStatus.PUBLISHED
    db_post.published_at = datetime.now(timezone.utc)
    db_post.published_message_id = published_message_id
    
    logger.info(f"💾 Сохраняю изменения в базе данных для поста {post_id}")
    
    try:
        db.commit()
        db.refresh(db_post)
        logger.info(f"✅ Пост {post_id} успешно отмечен как опубликованный со статусом {db_post.status}")
        return db_post
    except Exception as e:
        logger.error(f"💥 Ошибка при сохранении поста {post_id}: {str(e)}")
        db.rollback()
        return None


def publish_post(db: Session, post_id: int, target_channel_id: int) -> Optional[Post]:
    """Mark post for immediate publishing by setting it to APPROVED status with target channel."""
    db_post = get_post(db, post_id)
    if not db_post:
        return None
    
    # Only allow publishing of approved posts
    if db_post.status != PostStatus.APPROVED:
        return None
    
    # Update target channel if provided
    db_post.target_channel_id = target_channel_id
    
    db.commit()
    db.refresh(db_post)
    return db_post


def get_pending_posts(db: Session, limit: int = 50) -> List[Post]:
    return db.query(Post).filter(Post.status == PostStatus.PENDING).order_by(Post.created_at).limit(limit).all()


def get_approved_posts(db: Session, limit: int = 50) -> List[Post]:
    return db.query(Post).filter(Post.status == PostStatus.APPROVED).order_by(Post.approved_at).limit(limit).all()


def get_scheduled_posts_ready_to_publish(db: Session, limit: int = 50) -> List[Post]:
    """Get scheduled posts that are ready to be published (scheduled_at <= now)"""
    now = datetime.now(timezone.utc)
    return db.query(Post).filter(
        and_(
            Post.status == PostStatus.SCHEDULED,
            Post.scheduled_at <= now
        )
    ).order_by(Post.scheduled_at).limit(limit).all()


# Settings CRUD
def get_setting(db: Session, key: str) -> Optional[Settings]:
    return db.query(Settings).filter(Settings.key == key).first()


def get_settings(db: Session, skip: int = 0, limit: int = 100) -> List[Settings]:
    return db.query(Settings).offset(skip).limit(limit).all()


def create_setting(db: Session, setting: SettingCreate) -> Settings:
    db_setting = Settings(**setting.dict())
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting


def update_setting(db: Session, key: str, setting_update: SettingUpdate) -> Optional[Settings]:
    db_setting = get_setting(db, key)
    if not db_setting:
        return None
    
    update_data = setting_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_setting, field, value)
    
    db.commit()
    db.refresh(db_setting)
    return db_setting


def upsert_setting(db: Session, key: str, value: str, description: Optional[str] = None) -> Settings:
    from datetime import datetime, timezone
    
    db_setting = get_setting(db, key)
    if db_setting:
        db_setting.value = value
        db_setting.updated_at = datetime.now(timezone.utc)
        if description:
            db_setting.description = description
    else:
        db_setting = Settings(key=key, value=value, description=description)
        db.add(db_setting)
    
    db.commit()
    db.refresh(db_setting)
    return db_setting


# Worker Status CRUD
def get_worker_status(db: Session) -> Optional[WorkerStatus]:
    return db.query(WorkerStatus).first()


def get_or_create_worker_status(db: Session) -> WorkerStatus:
    worker_status = get_worker_status(db)
    if not worker_status:
        worker_status = WorkerStatus()
        db.add(worker_status)
        db.commit()
        db.refresh(worker_status)
    return worker_status


def update_worker_status(db: Session, should_run: bool = None, is_running: bool = None, heartbeat: bool = False) -> WorkerStatus:
    worker_status = get_or_create_worker_status(db)
    
    if should_run is not None:
        worker_status.should_run = should_run
        if should_run and not worker_status.is_running:
            worker_status.started_at = datetime.now(timezone.utc)
        elif not should_run and worker_status.is_running:
            worker_status.stopped_at = datetime.now(timezone.utc)
    
    if is_running is not None:
        worker_status.is_running = is_running
        if is_running:
            worker_status.started_at = datetime.now(timezone.utc)
        else:
            worker_status.stopped_at = datetime.now(timezone.utc)
    
    if heartbeat:
        worker_status.last_heartbeat = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(worker_status)
    return worker_status


# Scrapper Status CRUD
def get_scrapper_status(db: Session) -> Optional[ScrapperStatus]:
    return db.query(ScrapperStatus).first()


def get_or_create_scrapper_status(db: Session) -> ScrapperStatus:
    scrapper_status = get_scrapper_status(db)
    if not scrapper_status:
        scrapper_status = ScrapperStatus()
        db.add(scrapper_status)
        db.commit()
        db.refresh(scrapper_status)
    return scrapper_status


def update_scrapper_status(db: Session, should_run: bool = None, is_running: bool = None, heartbeat: bool = False) -> ScrapperStatus:
    scrapper_status = get_or_create_scrapper_status(db)
    
    if should_run is not None:
        scrapper_status.should_run = should_run
        if should_run and not scrapper_status.is_running:
            scrapper_status.started_at = datetime.now(timezone.utc)
        elif not should_run and scrapper_status.is_running:
            scrapper_status.stopped_at = datetime.now(timezone.utc)
    
    if is_running is not None:
        scrapper_status.is_running = is_running
        if is_running:
            scrapper_status.started_at = datetime.now(timezone.utc)
        else:
            scrapper_status.stopped_at = datetime.now(timezone.utc)
    
    if heartbeat:
        scrapper_status.last_heartbeat = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(scrapper_status)
    return scrapper_status


# Publisher Status CRUD
def get_publisher_status(db: Session) -> Optional[PublisherStatus]:
    return db.query(PublisherStatus).first()


def get_or_create_publisher_status(db: Session) -> PublisherStatus:
    publisher_status = get_publisher_status(db)
    if not publisher_status:
        publisher_status = PublisherStatus()
        db.add(publisher_status)
        db.commit()
        db.refresh(publisher_status)
    return publisher_status


def update_publisher_status(db: Session, should_run: bool = None, is_running: bool = None, heartbeat: bool = False) -> PublisherStatus:
    publisher_status = get_or_create_publisher_status(db)
    
    if should_run is not None:
        publisher_status.should_run = should_run
        if should_run and not publisher_status.is_running:
            publisher_status.started_at = datetime.now(timezone.utc)
        elif not should_run and publisher_status.is_running:
            publisher_status.stopped_at = datetime.now(timezone.utc)
    
    if is_running is not None:
        publisher_status.is_running = is_running
        if is_running:
            publisher_status.started_at = datetime.now(timezone.utc)
        else:
            publisher_status.stopped_at = datetime.now(timezone.utc)
    
    if heartbeat:
        publisher_status.last_heartbeat = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(publisher_status)
    return publisher_status


# AI Model CRUD
def get_ai_models(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[AIModel]:
    query = db.query(AIModel).order_by(AIModel.created_at)
    if active_only:
        query = query.filter(AIModel.is_active == True)
    return query.offset(skip).limit(limit).all()


def get_ai_model(db: Session, model_id: int) -> Optional[AIModel]:
    return db.query(AIModel).filter(AIModel.id == model_id).first()


def get_ai_model_by_model_id(db: Session, model_id: str) -> Optional[AIModel]:
    return db.query(AIModel).filter(AIModel.model_id == model_id).first()


def get_default_ai_model(db: Session) -> Optional[AIModel]:
    return db.query(AIModel).filter(
        and_(AIModel.is_default == True, AIModel.is_active == True)
    ).first()


def create_ai_model(db: Session, model: AIModelCreate) -> AIModel:
    db_model = AIModel(**model.dict())
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


def update_ai_model(db: Session, model_id: int, model_update: AIModelUpdate) -> Optional[AIModel]:
    db_model = get_ai_model(db, model_id)
    if not db_model:
        return None
    
    update_data = model_update.dict(exclude_unset=True)
    
    # If setting this model as default, unset other defaults
    if update_data.get('is_default', False):
        db.query(AIModel).filter(AIModel.is_default == True).update({'is_default': False})
    
    for field, value in update_data.items():
        setattr(db_model, field, value)
    
    db.commit()
    db.refresh(db_model)
    return db_model


def delete_ai_model(db: Session, model_id: int) -> bool:
    db_model = get_ai_model(db, model_id)
    if not db_model:
        return False
    
    # Don't allow deleting the default model
    if db_model.is_default:
        return False
    
    db.delete(db_model)
    db.commit()
    return True


def set_default_ai_model(db: Session, model_id: int) -> Optional[AIModel]:
    # First, unset all defaults
    db.query(AIModel).filter(AIModel.is_default == True).update({'is_default': False})
    
    # Then set the new default
    db_model = get_ai_model(db, model_id)
    if not db_model or not db_model.is_active:
        return None
    
    db_model.is_default = True
    db.commit()
    db.refresh(db_model)
    return db_model


# Dashboard stats
def get_dashboard_stats(db: Session) -> Dict[str, Any]:
    today = datetime.now(timezone.utc).date()
    
    return {
        "total_source_channels": db.query(SourceChannel).count(),
        "active_source_channels": db.query(SourceChannel).filter(SourceChannel.is_active == True).count(),
        "total_target_channels": db.query(TargetChannel).count(),
        "active_target_channels": db.query(TargetChannel).filter(TargetChannel.is_active == True).count(),
        "pending_posts": db.query(Post).filter(Post.status == PostStatus.PENDING).count(),
        "approved_posts": db.query(Post).filter(Post.status == PostStatus.APPROVED).count(),
        "rejected_posts": db.query(Post).filter(Post.status == PostStatus.REJECTED).count(),
        "published_posts": db.query(Post).filter(Post.status == PostStatus.PUBLISHED).count(),
        "posts_today": db.query(Post).filter(func.date(Post.created_at) == today).count(),
    }