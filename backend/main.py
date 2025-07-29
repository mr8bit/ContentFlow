from fastapi import FastAPI, Depends, HTTPException, status, Body, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, datetime, timezone
import logging

from database import get_db, engine
from models import Base, User, PostStatus
from schemas import (
    UserLogin, UserCreate, Token, User as UserSchema,
    SourceChannel, SourceChannelCreate, SourceChannelUpdate,
    TargetChannel, TargetChannelCreate, TargetChannelUpdate,
    Post, PostUpdate, PostApproval, PostSchedule, PostPublish,
    Setting, SettingCreate, SettingUpdate,
    DashboardStats, MessageResponse,
    SessionGenerationStart, SessionGenerationVerify,
    AIModelCreate, AIModel, AIModelUpdate,
    ServiceStatus
)
import crud
from auth import authenticate_user, create_access_token, get_current_user, get_current_admin_user, create_admin_user
from config import settings
from telegram_service import telegram_service
from openrouter_service import openrouter_service
from upload_service import upload_service
# LLM Worker now runs as separate service

# Setup logging
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Auto Poster Bot API",
    description="API for automated Telegram channel monitoring and reposting",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


@app.on_event("startup")
async def startup_event():
    """Initialize the application."""
    # Create admin user if it doesn't exist
    db = next(get_db())
    create_admin_user(db)
    
    # Initialize default settings (but don't overwrite existing non-empty values)
    # Only create settings if they don't exist or are empty
    existing_bot_token = crud.get_setting(db, "telegram_bot_token")
    if not existing_bot_token or not existing_bot_token.value.strip():
        crud.upsert_setting(db, "telegram_bot_token", settings.telegram_bot_token or "", "Telegram Bot Token")
    
    existing_api_id = crud.get_setting(db, "telegram_api_id")
    if not existing_api_id or not existing_api_id.value.strip():
        crud.upsert_setting(db, "telegram_api_id", str(settings.telegram_api_id or ""), "Telegram API ID")
    
    existing_api_hash = crud.get_setting(db, "telegram_api_hash")
    if not existing_api_hash or not existing_api_hash.value.strip():
        crud.upsert_setting(db, "telegram_api_hash", settings.telegram_api_hash or "", "Telegram API Hash")
    
    # Only update telegram_session_string if it doesn't exist or is empty
    existing_session = crud.get_setting(db, "telegram_session_string")
    if not existing_session or not existing_session.value.strip():
        crud.upsert_setting(db, "telegram_session_string", settings.telegram_session_string or "", "Telegram User Session String")
    
    existing_openrouter_key = crud.get_setting(db, "openrouter_api_key")
    if not existing_openrouter_key or not existing_openrouter_key.value.strip():
        crud.upsert_setting(db, "openrouter_api_key", settings.openrouter_api_key or "", "OpenRouter API Key")
    crud.upsert_setting(db, "default_check_interval", str(settings.default_check_interval), "Default Check Interval (minutes)")
    
    # Initialize AI prompts with default values
    default_rewrite_prompt = """Перепиши следующий текст, сохранив основную идею и информацию, но изменив формулировку:

Оригинальный текст:
{original_text}

Требования:
1. Сохрани все важные факты и цифры
2. Измени структуру предложений
3. Используй синонимы и альтернативные формулировки
4. Сохрани тон и стиль, подходящий для Telegram-канала
5. Если есть ссылки или упоминания, сохрани их
6. Текст должен быть естественным и читаемым

Переписанный текст:"""
    
    default_improve_prompt = """Улучши следующий текст согласно указаниям пользователя:

Оригинальный текст:
{original_text}

Инструкции пользователя:
{user_prompt}

Требования:
1. Следуй инструкциям пользователя
2. Сохрани все важные факты и цифры
3. Сохрани ссылки и упоминания, если они есть
4. Текст должен быть естественным и читаемым
5. Подходящий стиль для Telegram-канала

Улучшенный текст:"""
    
    # Only initialize prompts if they don't exist
    existing_rewrite_prompt = crud.get_setting(db, "rewrite_prompt")
    if not existing_rewrite_prompt:
        crud.upsert_setting(db, "rewrite_prompt", default_rewrite_prompt, "Промпт для переписывания текстов")
    
    existing_improve_prompt = crud.get_setting(db, "improve_prompt")
    if not existing_improve_prompt:
        crud.upsert_setting(db, "improve_prompt", default_improve_prompt, "Промпт для улучшения текстов с пользовательскими инструкциями")
    
    db.close()
    
    # Test external services
    telegram_ok = await telegram_service.test_bot_token()
    openrouter_ok = await openrouter_service.test_connection()
    
    print(f"Telegram Bot: {'✓' if telegram_ok else '✗'}")
    print(f"OpenRouter API: {'✓' if openrouter_ok else '✗'}")
    
    # LLM Worker now runs as separate service


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown."""
    # LLM Worker now runs as separate service
    pass


# Authentication endpoints
@app.post("/api/auth/register", response_model=UserSchema)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = crud.get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user
    user = crud.create_user(db, user_data)
    return user


@app.post("/api/auth/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.jwt_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserSchema)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


# Dashboard endpoint
@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud.get_dashboard_stats(db)


# Source channels endpoints
@app.get("/api/source-channels", response_model=List[SourceChannel])
async def get_source_channels(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud.get_source_channels(db, skip=skip, limit=limit, active_only=active_only)


@app.post("/api/source-channels", response_model=SourceChannel)
async def create_source_channel(
    channel: SourceChannelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Check if channel already exists
    existing = crud.get_source_channel_by_telegram_id(db, channel.channel_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Channel already exists"
        )
    
    # Verify channel access
    access_info = await telegram_service.check_channel_access(channel.channel_id)
    if not access_info["channel_exists"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Channel not found or bot doesn't have access"
        )
    
    return crud.create_source_channel(db, channel)


@app.get("/api/source-channels/{channel_id}", response_model=SourceChannel)
async def get_source_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    channel = crud.get_source_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@app.put("/api/source-channels/{channel_id}", response_model=SourceChannel)
async def update_source_channel(
    channel_id: int,
    channel_update: SourceChannelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    channel = crud.update_source_channel(db, channel_id, channel_update)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@app.delete("/api/source-channels/{channel_id}", response_model=MessageResponse)
async def delete_source_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    success = crud.delete_source_channel(db, channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"message": "Channel deleted successfully"}


# Target channels endpoints
@app.get("/api/target-channels", response_model=List[TargetChannel])
async def get_target_channels(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud.get_target_channels(db, skip=skip, limit=limit, active_only=active_only)


@app.post("/api/target-channels", response_model=TargetChannel)
async def create_target_channel(
    channel: TargetChannelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Check if channel already exists
    existing = crud.get_target_channel_by_telegram_id(db, channel.channel_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Channel already exists"
        )
    
    # Verify channel access
    access_info = await telegram_service.check_channel_access(channel.channel_id)
    if not access_info["can_post"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bot doesn't have permission to post in this channel"
        )
    
    return crud.create_target_channel(db, channel)


@app.get("/api/target-channels/{channel_id}", response_model=TargetChannel)
async def get_target_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    channel = crud.get_target_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@app.put("/api/target-channels/{channel_id}", response_model=TargetChannel)
async def update_target_channel(
    channel_id: int,
    channel_update: TargetChannelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    channel = crud.update_target_channel(db, channel_id, channel_update)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@app.delete("/api/target-channels/{channel_id}", response_model=MessageResponse)
async def delete_target_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    success = crud.delete_target_channel(db, channel_id)
    if not success:
        raise HTTPException(status_code=404, detail="Channel not found")
    return {"message": "Channel deleted successfully"}


# LLM Classification endpoints
@app.post("/api/posts/{post_id}/classify", response_model=Post)
async def classify_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Manually trigger LLM classification for a specific post"""
    from services.llm_classifier import LLMClassifier
    from config import settings
    
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get OpenRouter API key from database
    openrouter_key_setting = crud.get_setting(db, "openrouter_api_key")
    if not openrouter_key_setting or not openrouter_key_setting.value.strip():
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured in database")
    
    # Get model from settings or use default
    model = settings.openrouter_model or "anthropic/claude-3-haiku"
    
    classifier = LLMClassifier(openrouter_key_setting.value, model)
    success = await classifier.process_post_classification(db, post)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to classify post")
    
    return post


# Posts endpoints
@app.post("/api/posts", response_model=Post)
async def create_post(
    post_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new post from frontend."""
    try:
        # Validate required fields
        if not post_data.get('target_channel_id'):
            raise HTTPException(status_code=400, detail="Target channel ID is required")
        
        if not post_data.get('text') and not post_data.get('media_files'):
            raise HTTPException(status_code=400, detail="Either text or media files are required")
        
        # Create the post
        post = crud.create_post_from_frontend(db, post_data, current_user.id)
        
        logger.info(f"Post {post.id} created successfully by user {current_user.id}")
        return post
        
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create post")


@app.get("/api/posts", response_model=List[Post])
async def get_posts(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    source_channel_id: Optional[int] = None,
    target_channel_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_manual: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Parse date strings to datetime objects
    parsed_date_from = None
    parsed_date_to = None
    
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use ISO format.")
    
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use ISO format.")
    
    return crud.get_posts(
        db, 
        skip=skip, 
        limit=limit, 
        status=status,
        source_channel_id=source_channel_id,
        target_channel_id=target_channel_id,
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        is_manual=is_manual
    )


@app.get("/api/posts/count")
async def get_posts_count(
    status: Optional[str] = None,
    source_channel_id: Optional[int] = None,
    target_channel_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    is_manual: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Parse date strings to datetime objects
    parsed_date_from = None
    parsed_date_to = None
    
    if date_from:
        try:
            parsed_date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use ISO format.")
    
    if date_to:
        try:
            parsed_date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use ISO format.")
    
    count = crud.get_posts_count(
        db,
        status=status,
        source_channel_id=source_channel_id,
        target_channel_id=target_channel_id,
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        is_manual=is_manual
    )
    
    return {"count": count}


@app.get("/api/posts/{post_id}", response_model=Post)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@app.put("/api/posts/{post_id}", response_model=Post)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    post = crud.update_post(db, post_id, post_update)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@app.post("/api/posts/{post_id}/approve", response_model=Post)
async def approve_post(
    post_id: int,
    approval_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    target_channel_id = approval_data.get('target_channel_id')
    admin_notes = approval_data.get('admin_notes')
    
    if not target_channel_id:
        raise HTTPException(status_code=400, detail="Target channel ID is required")
    
    post = crud.approve_post(
        db, post_id, current_user.id, target_channel_id, admin_notes
    )
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return post


@app.post("/api/posts/{post_id}/schedule", response_model=Post)
async def schedule_post(
    post_id: int,
    schedule: PostSchedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    post = crud.schedule_post(
        db, post_id, current_user.id, schedule.target_channel_id, 
        schedule.scheduled_at, schedule.admin_notes
    )
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Update processed text if provided
    if schedule.processed_text:
        post = crud.update_post(db, post_id, PostUpdate(processed_text=schedule.processed_text))
    
    return post


@app.post("/api/posts/{post_id}/publish", response_model=Post)
async def publish_post(
    post_id: int,
    publish_data: PostPublish,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    # Get the post and verify it can be published
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.status != "approved":
        raise HTTPException(status_code=400, detail="Post must be approved before publishing")
    
    # Update target channel and mark for immediate publishing
    post.target_channel_id = publish_data.target_channel_id
    post.status = PostStatus.PUBLISHING  # Mark as being published
    post.scheduled_at = datetime.now(timezone.utc)  # Set to publish immediately
    
    db.commit()
    db.refresh(post)
    
    logger.info(f"Post {post_id} marked for immediate publishing to channel {publish_data.target_channel_id}")
    
    # Wait a bit for worker to pick up the post
    import asyncio
    await asyncio.sleep(5)
    
    # Refresh post to get updated status
    db.refresh(post)
    
    if post.status == "published":
        logger.info(f"Post {post_id} successfully published via manual publish button")
        return post
    else:
        # Post is being processed by worker, return current status
        logger.info(f"Post {post_id} is being processed by worker, current status: {post.status}")
        return post


@app.get("/api/posts/pending", response_model=List[Post])
async def get_pending_posts(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud.get_pending_posts(db, limit=limit)


@app.post("/api/posts/{post_id}/process", response_model=Post)
async def process_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Process post using LLM with target channel prompt"""
    # Get the post
    post = crud.get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if post has AI categorization info
    if not post.target_channel_id:
        raise HTTPException(status_code=400, detail="Post must have target channel from AI categorization")
    
    # Check if post has original text
    if not post.original_text or not post.original_text.strip():
        raise HTTPException(status_code=400, detail="Post must have original text to process")
    
    try:
        # Import LLM worker functionality
        from workers.llm_worker import LLMWorker
        
        # Create LLM worker instance
        llm_worker = LLMWorker()
        
        # Process the post using the existing rewrite function
        await llm_worker.rewrite_post_for_target_channel(db, post)
        
        # Refresh post to get updated data
        db.refresh(post)
        
        logger.info(f"Post {post_id} processed successfully by user {current_user.id}")
        return post
        
    except Exception as e:
        logger.error(f"Error processing post {post_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process post: {str(e)}")


@app.post("/api/posts/improve-text")
async def improve_text(
    request: dict = Body(...),
    current_user: User = Depends(get_current_admin_user)
):
    """Improve text using OpenRouter API."""
    text = request.get("text")
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        improved_text = await openrouter_service.rewrite_text(text)
        if improved_text:
            return {"improved_text": improved_text}
        else:
            raise HTTPException(status_code=500, detail="Failed to improve text")
    except Exception as e:
        logger.error(f"Error improving text: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/posts/improve-text-with-prompt")
async def improve_text_with_prompt(
    request: dict = Body(...),
    current_user: User = Depends(get_current_admin_user)
):
    """Improve text using OpenRouter API with custom user prompt."""
    text = request.get("text")
    prompt = request.get("prompt")
    
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        improved_text = await openrouter_service.improve_text_with_prompt(text, prompt)
        if improved_text:
            return {"improved_text": improved_text}
        else:
            raise HTTPException(status_code=500, detail="Failed to improve text with prompt")
    except Exception as e:
        logger.error(f"Error improving text with prompt: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Settings endpoints
@app.get("/api/settings", response_model=List[Setting])
async def get_settings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return crud.get_settings(db, skip=skip, limit=limit)


@app.get("/api/settings/{key}", response_model=Setting)
async def get_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    setting = crud.get_setting(db, key)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@app.put("/api/settings/{key}", response_model=Setting)
async def update_setting(
    key: str,
    setting_update: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    setting = crud.update_setting(db, key, setting_update)
    if not setting:
        # Create new setting if it doesn't exist
        setting = crud.upsert_setting(db, key, setting_update.value, setting_update.description)
    return setting


# Session generation state storage (in production, use Redis or database)
session_generation_state = {}

# Telegram session and worker management endpoints
@app.post("/api/telegram/generate-session/start")
async def start_session_generation(
    request: SessionGenerationStart,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Start session generation process by sending phone number"""
    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
        import uuid
        
        # Get API credentials
        api_id_setting = crud.get_setting(db, "telegram_api_id")
        api_hash_setting = crud.get_setting(db, "telegram_api_hash")
        
        if not all([api_id_setting, api_hash_setting]):
            raise HTTPException(
                status_code=400,
                detail="Missing Telegram API credentials. Please set api_id and api_hash first."
            )
        
        # Create unique session ID
        session_id = str(uuid.uuid4())
        
        # Create Telegram client
        client = TelegramClient(
            StringSession(),
            int(api_id_setting.value),
            api_hash_setting.value
        )
        
        await client.connect()
        
        # Send code request
        sent_code = await client.send_code_request(request.phone_number)
        
        # Store session state
        session_generation_state[session_id] = {
            'client': client,
            'phone_number': request.phone_number,
            'phone_code_hash': sent_code.phone_code_hash,
            'user_id': current_user.id
        }
        
        return {
            "status": "success",
            "message": "Код подтверждения отправлен на ваш телефон",
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Failed to start session generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при отправке кода: {str(e)}"
        )


@app.post("/api/telegram/generate-session/verify")
async def verify_session_code(
    request: SessionGenerationVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Verify code and complete session generation"""
    try:
        # Get session state
        if request.session_id not in session_generation_state:
            raise HTTPException(
                status_code=400,
                detail="Недействительный или истёкший session_id"
            )
        
        state = session_generation_state[request.session_id]
        
        # Verify user
        if state['user_id'] != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Доступ запрещён"
            )
        
        client = state['client']
        
        try:
            # Sign in with code
            await client.sign_in(
                phone=state['phone_number'],
                code=request.code,
                phone_code_hash=state['phone_code_hash']
            )
        except Exception as e:
            error_str = str(e)
            if ("SessionPasswordNeeded" in error_str or 
                "Two-step verification" in error_str or 
                "Two-steps verification" in error_str or
                "password is required" in error_str):
                if not request.password:
                    return {
                        "status": "password_required",
                        "message": "Требуется пароль двухфакторной аутентификации",
                        "session_id": request.session_id
                    }
                # Try with password
                try:
                    await client.sign_in(password=request.password)
                except Exception as password_error:
                    logger.error(f"2FA password failed: {str(password_error)}")
                    raise HTTPException(
                        status_code=400,
                        detail="Неверный пароль двухфакторной аутентификации"
                    )
            else:
                logger.error(f"Sign in failed: {error_str}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Ошибка входа: {error_str}"
                )
        
        # Get user info
        me = await client.get_me()
        
        if me.bot:
            await client.disconnect()
            del session_generation_state[request.session_id]
            raise HTTPException(
                status_code=400,
                detail="Это bot-аккаунт. Нужен обычный пользовательский аккаунт."
            )
        
        # Get session string
        session_string = client.session.save()
        logger.info(f"Generated session string length: {len(session_string)}")
        
        # Save session to database
        saved_setting = crud.upsert_setting(db, "telegram_session_string", session_string)
        logger.info(f"Session saved to database with ID: {saved_setting.id}, value length: {len(saved_setting.value)}")
        
        # Verify it was saved correctly
        verification_setting = crud.get_setting(db, "telegram_session_string")
        if verification_setting and verification_setting.value:
            logger.info(f"Session verification successful, stored value length: {len(verification_setting.value)}")
        else:
            logger.error("Session verification failed - value not found or empty in database")
        
        # Cleanup
        await client.disconnect()
        del session_generation_state[request.session_id]
        
        return {
            "status": "success",
            "message": "Сессия успешно создана и сохранена",
            "user_info": {
                "id": me.id,
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Cleanup on error
        if request.session_id in session_generation_state:
            try:
                await session_generation_state[request.session_id]['client'].disconnect()
            except:
                pass
            del session_generation_state[request.session_id]
        
        logger.error(f"Session verification failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при подтверждении кода: {str(e)}"
        )


@app.delete("/api/telegram/generate-session/{session_id}")
async def cancel_session_generation(
    session_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """Cancel session generation process"""
    if session_id in session_generation_state:
        state = session_generation_state[session_id]
        
        # Verify user
        if state['user_id'] != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Доступ запрещён"
            )
        
        try:
            await state['client'].disconnect()
        except:
            pass
        
        del session_generation_state[session_id]
        
        return {
            "status": "success",
            "message": "Генерация сессии отменена"
        }
    
    return {
        "status": "info",
        "message": "Сессия не найдена или уже завершена"
    }


@app.post("/api/telegram/settings")
async def save_telegram_settings(
    settings_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Save Telegram settings to database"""
    try:
        saved_settings = {}
        
        # Define allowed Telegram settings
        allowed_settings = {
            'telegram_bot_token': 'Токен Telegram бота для публикации сообщений',
            'telegram_api_id': 'API ID для подключения к Telegram API',
            'telegram_api_hash': 'API Hash для подключения к Telegram API',
            'telegram_session_string': 'Строка сессии для чтения сообщений из каналов'
        }
        
        # Save each setting
        for key, value in settings_data.items():
            if key in allowed_settings and value is not None:
                # Convert to string for storage
                str_value = str(value).strip() if value else ''
                
                if str_value:  # Only save non-empty values
                    setting = crud.upsert_setting(
                        db, 
                        key, 
                        str_value, 
                        allowed_settings[key]
                    )
                    saved_settings[key] = {
                        'value': setting.value,
                        'description': setting.description,
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None
                    }
        
        return {
            "status": "success",
            "message": f"Сохранено {len(saved_settings)} настроек Telegram",
            "settings": saved_settings
        }
        
    except Exception as e:
        logger.error(f"Failed to save Telegram settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save Telegram settings: {str(e)}"
        )


@app.get("/api/telegram/settings")
async def get_telegram_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get current Telegram settings from database"""
    try:
        telegram_keys = [
            'telegram_bot_token',
            'telegram_api_id', 
            'telegram_api_hash',
            'telegram_session_string'
        ]
        
        settings_data = {}
        
        for key in telegram_keys:
            setting = crud.get_setting(db, key)
            if setting:
                # Mask sensitive values for security
                if 'token' in key or 'hash' in key or 'session' in key:
                    masked_value = setting.value[:8] + '*' * (len(setting.value) - 8) if len(setting.value) > 8 else '*' * len(setting.value)
                    settings_data[key] = {
                        'value': masked_value,
                        'has_value': bool(setting.value),
                        'description': setting.description,
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None
                    }
                else:
                    settings_data[key] = {
                        'value': setting.value,
                        'has_value': bool(setting.value),
                        'description': setting.description,
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None
                    }
            else:
                settings_data[key] = {
                    'value': '',
                    'has_value': False,
                    'description': None,
                    'updated_at': None
                }
        
        return {
            "status": "success",
            "settings": settings_data
        }
        
    except Exception as e:
        logger.error(f"Failed to get Telegram settings: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get Telegram settings: {str(e)}"
        )


@app.post("/api/telegram/test-session")
async def test_telegram_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Test Telegram session connectivity"""
    try:
        from telegram_scraper_service import TelegramChannelScraper
        from telethon import TelegramClient
        from telethon.sessions import StringSession
        
        # Get current settings
        session_string_setting = crud.get_setting(db, "telegram_session_string")
        api_id_setting = crud.get_setting(db, "telegram_api_id")
        api_hash_setting = crud.get_setting(db, "telegram_api_hash")
        
        if not all([session_string_setting, api_id_setting, api_hash_setting]):
            raise HTTPException(
                status_code=400, 
                detail="Missing required Telegram settings (session_string, api_id, api_hash)"
            )
        
        if not session_string_setting.value:
            raise HTTPException(
                status_code=400,
                detail="Telegram session string is empty. Please generate a session first."
            )
        
        # Test session
        client = TelegramClient(
            StringSession(session_string_setting.value),
            int(api_id_setting.value),
            api_hash_setting.value
        )
        
        await client.connect()
        
        if not await client.is_user_authorized():
            await client.disconnect()
            raise HTTPException(
                status_code=400,
                detail="Session is not authorized. Please regenerate the session."
            )
        
        # Get user info
        me = await client.get_me()
        await client.disconnect()
        
        return {
            "status": "success",
            "message": "Telegram session is valid and authorized",
            "user_info": {
                "id": me.id,
                "username": me.username,
                "first_name": me.first_name,
                "last_name": me.last_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session test failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Session test failed: {str(e)}"
        )


@app.post("/api/worker/start")
async def start_worker(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Start the worker process by setting should_run flag in database"""
    try:
        # Update worker status in database to indicate it should run
        worker_status = crud.update_worker_status(db, should_run=True)
        
        return {
            "status": "success",
            "message": "Worker start signal sent. Worker will start monitoring channels.",
            "worker_status": {
                "should_run": worker_status.should_run,
                "is_running": worker_status.is_running,
                "last_heartbeat": worker_status.last_heartbeat.isoformat() if worker_status.last_heartbeat else None
            }
        }
            
    except Exception as e:
        logger.error(f"Failed to start worker: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start worker: {str(e)}"
        )


@app.post("/api/worker/stop")
async def stop_worker(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Stop the worker process by setting should_run flag to false in database"""
    try:
        # Update worker status in database to indicate it should stop
        worker_status = crud.update_worker_status(db, should_run=False)
        
        return {
            "status": "success",
            "message": "Worker stop signal sent. Worker will stop monitoring channels.",
            "worker_status": {
                "should_run": worker_status.should_run,
                "is_running": worker_status.is_running,
                "last_heartbeat": worker_status.last_heartbeat.isoformat() if worker_status.last_heartbeat else None
            }
        }
            
    except Exception as e:
        logger.error(f"Failed to stop worker: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop worker: {str(e)}"
        )


@app.get("/api/worker/status")
async def get_worker_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get worker process status from database"""
    try:
        worker_status = crud.get_worker_status(db)
        
        if not worker_status:
            return {
                "status": "stopped",
                "should_run": False,
                "is_running": False,
                "last_heartbeat": None,
                "started_at": None,
                "stopped_at": None
            }
        
        # Determine overall status
        if worker_status.is_running and worker_status.should_run:
            status = "running"
        elif worker_status.should_run and not worker_status.is_running:
            status = "starting"
        elif not worker_status.should_run and worker_status.is_running:
            status = "stopping"
        else:
            status = "stopped"
            
        return {
            "status": status,
            "should_run": worker_status.should_run,
            "is_running": worker_status.is_running,
            "last_heartbeat": worker_status.last_heartbeat.isoformat() if worker_status.last_heartbeat else None,
            "started_at": worker_status.started_at.isoformat() if worker_status.started_at else None,
            "stopped_at": worker_status.stopped_at.isoformat() if worker_status.stopped_at else None
        }
            
    except Exception as e:
        logger.error(f"Failed to get worker status: {str(e)}")
        return {
            "status": "error",
            "details": str(e)
        }


# Media serving endpoint
@app.get("/api/media/{filename}")
async def serve_media_file(
    filename: str
):
    """Serve media files from the media directory"""
    import os
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    
    # Security: only allow alphanumeric characters, dots, hyphens, and underscores
    import re
    if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Look for the file in multiple directories
    search_dirs = ["./media", "./media/uploads", "./data"]
    file_path = None
    
    # First, try direct paths in media directories
    for media_dir in search_dirs[:2]:  # media and media/uploads
        potential_path = os.path.join(media_dir, filename)
        if os.path.exists(potential_path) and os.path.isfile(potential_path):
            file_path = potential_path
            break
    
    # If not found, search recursively in data directory for backward compatibility
    if not file_path and os.path.exists("./data"):
        for root, dirs, files in os.walk("./data"):
            if filename in files:
                potential_path = os.path.join(root, filename)
                if os.path.isfile(potential_path):
                    file_path = potential_path
                    break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Media file not found")
    
    # Determine media type for proper Content-Type header
    import mimetypes
    content_type, _ = mimetypes.guess_type(file_path)
    return FileResponse(
        file_path,
        media_type=content_type,
        filename=filename
    )


@app.get("/api/media/{file_path:path}")
async def serve_media_by_path(
    file_path: str
):
    """Serve media files by full path (e.g., media/28324_photo.jpg)"""
    import os
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    
    # Security: validate path to prevent directory traversal
    import re
    if not re.match(r'^[a-zA-Z0-9._-]+$', file_path):
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    # Construct full path
    full_path = os.path.join(".", "media", file_path)
    
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Media file not found")
    
    # Determine media type for proper Content-Type header
    import mimetypes
    content_type, _ = mimetypes.guess_type(full_path)
    filename = os.path.basename(file_path)
    
    return FileResponse(
        full_path,
        media_type=content_type,
        filename=filename
    )


# AI Models endpoints
@app.get("/api/ai-models", response_model=List[AIModel])
async def get_ai_models(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get all AI models"""
    models = crud.get_ai_models(db, skip=skip, limit=limit)
    return models


@app.get("/api/ai-models/{model_id}", response_model=AIModel)
async def get_ai_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get AI model by ID"""
    model = crud.get_ai_model(db, model_id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")
    return model


@app.post("/api/ai-models", response_model=AIModel)
async def create_ai_model(
    model: AIModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create new AI model"""
    # Check if model with same model_id already exists
    existing_model = crud.get_ai_model_by_model_id(db, model_id=model.model_id)
    if existing_model:
        raise HTTPException(
            status_code=400,
            detail="AI model with this model_id already exists"
        )
    
    return crud.create_ai_model(db=db, model=model)


@app.put("/api/ai-models/{model_id}", response_model=AIModel)
async def update_ai_model(
    model_id: int,
    model_update: AIModelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update AI model"""
    model = crud.update_ai_model(db, model_id=model_id, model_update=model_update)
    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")
    return model


@app.delete("/api/ai-models/{model_id}")
async def delete_ai_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete AI model"""
    success = crud.delete_ai_model(db, model_id=model_id)
    if not success:
        raise HTTPException(status_code=404, detail="AI model not found or cannot be deleted")
    return {"message": "AI model deleted successfully"}


@app.post("/api/ai-models/{model_id}/set-default")
async def set_default_ai_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Set AI model as default"""
    model = crud.set_default_ai_model(db, model_id=model_id)
    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")
    return {"message": "AI model set as default successfully", "model": model}


@app.get("/api/ai-models/default", response_model=AIModel)
async def get_default_ai_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get default AI model"""
    model = crud.get_default_ai_model(db)
    if not model:
        raise HTTPException(status_code=404, detail="No default AI model found")
    return model


# Upload endpoints
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user)
):
    """Upload a single file and return its info"""
    try:
        file_info = await upload_service.save_file(file)
        return {
            "status": "success",
            "filename": file_info["filename"]
        }
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {str(e)}"
        )


@app.post("/api/posts/create-with-media", response_model=Post)
async def create_post_with_media(
    text: str = Form(None),
    target_channel_id: int = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new post with multipart form data including text and media files."""
    try:
        # Validate required fields
        if not target_channel_id:
            raise HTTPException(status_code=400, detail="Target channel ID is required")
        
        if not text and not files:
            raise HTTPException(status_code=400, detail="Either text or media files are required")
        
        # Upload files if provided
        media_files = []
        if files:
            for file in files:
                if file.filename:  # Skip empty file uploads
                    file_info = await upload_service.save_file(file)
                    media_files.append(file_info["filename"])
        
        # Create post data
        post_data = {
            "text": text,
            "media_files": media_files if media_files else None,
            "target_channel_id": target_channel_id
        }
        
        # Create the post
        post = crud.create_post_from_frontend(db, post_data, current_user.id)
        
        logger.info(f"Post {post.id} created successfully with {len(media_files)} media files by user {current_user.id}")
        return post
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating post with media: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create post: {str(e)}"
        )


@app.post("/api/upload/multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_admin_user)
):
    """Upload multiple files and return their info"""
    try:
        files_info = await upload_service.save_multiple_files(files)
        return {
            "status": "success",
            "files": files_info
        }
    except Exception as e:
        logger.error(f"Multiple file upload failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Multiple file upload failed: {str(e)}"
        )


# Service Management endpoints
@app.get("/api/scrapper/status", response_model=ServiceStatus)
async def get_scrapper_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get scrapper service status"""
    status = crud.get_or_create_scrapper_status(db)
    return status


@app.post("/api/scrapper/start")
async def start_scrapper(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Start scrapper service"""
    crud.update_scrapper_status(db, should_run=True)
    return {"message": "Scrapper start signal sent", "status": "success"}


@app.post("/api/scrapper/stop")
async def stop_scrapper(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Stop scrapper service"""
    crud.update_scrapper_status(db, should_run=False)
    return {"message": "Scrapper stop signal sent", "status": "success"}


@app.post("/api/scrapper/restart")
async def restart_scrapper(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Restart scrapper service"""
    # First stop, then start
    crud.update_scrapper_status(db, should_run=False)
    # Give it a moment to stop
    import asyncio
    await asyncio.sleep(2)
    crud.update_scrapper_status(db, should_run=True)
    return {"message": "Scrapper restart signal sent", "status": "success"}


@app.get("/api/publisher/status", response_model=ServiceStatus)
async def get_publisher_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get publisher service status"""
    status = crud.get_or_create_publisher_status(db)
    return status


@app.post("/api/publisher/start")
async def start_publisher(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Start publisher service"""
    crud.update_publisher_status(db, should_run=True)
    return {"message": "Publisher start signal sent", "status": "success"}


@app.post("/api/publisher/stop")
async def stop_publisher(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Stop publisher service"""
    crud.update_publisher_status(db, should_run=False)
    return {"message": "Publisher stop signal sent", "status": "success"}


@app.post("/api/publisher/restart")
async def restart_publisher(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Restart publisher service"""
    # First stop, then start
    crud.update_publisher_status(db, should_run=False)
    # Give it a moment to stop
    import asyncio
    await asyncio.sleep(2)
    crud.update_publisher_status(db, should_run=True)
    return {"message": "Publisher restart signal sent", "status": "success"}


@app.get("/api/llm-worker/status", response_model=ServiceStatus)
async def get_llm_worker_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get LLM worker service status"""
    status = crud.get_or_create_llm_worker_status(db)
    return status


@app.post("/api/llm-worker/start")
async def start_llm_worker_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Start LLM worker service"""
    crud.update_llm_worker_status(db, should_run=True)
    return {"message": "LLM Worker start signal sent", "status": "success"}


@app.post("/api/llm-worker/stop")
async def stop_llm_worker_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Stop LLM worker service"""
    crud.update_llm_worker_status(db, should_run=False)
    return {"message": "LLM Worker stop signal sent", "status": "success"}


@app.post("/api/llm-worker/restart")
async def restart_llm_worker_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Restart LLM worker service"""
    # First stop, then start
    crud.update_llm_worker_status(db, should_run=False)
    # Give it a moment to stop
    import asyncio
    await asyncio.sleep(2)
    crud.update_llm_worker_status(db, should_run=True)
    return {"message": "LLM Worker restart signal sent", "status": "success"}


# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)