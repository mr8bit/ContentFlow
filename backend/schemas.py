from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from models import PostStatus


# User schemas
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# Channel schemas
class SourceChannelBase(BaseModel):
    channel_id: str
    channel_name: str
    channel_username: Optional[str] = None
    check_interval: int = Field(default=5, ge=1, le=3600)


class SourceChannelCreate(SourceChannelBase):
    pass


class SourceChannelUpdate(BaseModel):
    channel_name: Optional[str] = None
    channel_username: Optional[str] = None
    is_active: Optional[bool] = None
    check_interval: Optional[int] = Field(default=None, ge=1, le=3600)


class SourceChannel(SourceChannelBase):
    id: int
    is_active: bool
    last_checked: Optional[datetime]
    last_message_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class TargetChannelBase(BaseModel):
    channel_id: str
    channel_name: str
    channel_username: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    classification_threshold: int = Field(default=80, ge=50, le=100)
    auto_publish_enabled: bool = False
    rewrite_prompt: Optional[str] = None


class TargetChannelCreate(TargetChannelBase):
    pass


class TargetChannelUpdate(BaseModel):
    channel_name: Optional[str] = None
    channel_username: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    classification_threshold: Optional[int] = Field(default=None, ge=50, le=100)
    auto_publish_enabled: Optional[bool] = None
    rewrite_prompt: Optional[str] = None
    is_active: Optional[bool] = None


class TargetChannel(TargetChannelBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Post schemas
class PostBase(BaseModel):
    original_text: Optional[str] = None
    original_media: Optional[Dict[str, Any]] = None


class PostCreate(PostBase):
    source_channel_id: Optional[int] = None
    original_message_id: int


class PostCreateFromFrontend(BaseModel):
    text: Optional[str] = None
    media_files: Optional[List[str]] = None  # List of media file paths
    target_channel_id: int


class PostUpdate(BaseModel):
    original_text: Optional[str] = None
    processed_text: Optional[str] = None
    status: Optional[PostStatus] = None
    target_channel_id: Optional[int] = None
    admin_notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class PostApproval(BaseModel):
    approved: bool
    target_channel_id: int
    admin_notes: Optional[str] = None
    processed_text: Optional[str] = None


class PostSchedule(BaseModel):
    target_channel_id: int
    scheduled_at: datetime
    admin_notes: Optional[str] = None
    processed_text: Optional[str] = None


class PostPublish(BaseModel):
    target_channel_id: int


class Post(PostBase):
    id: int
    source_channel_id: Optional[int] = None
    target_channel_id: Optional[int]
    original_message_id: int
    processed_text: Optional[str]
    llm_classification_confidence: Optional[int] = None
    llm_classification_result: Optional[str] = None
    is_manual: bool = False
    status: PostStatus
    created_at: datetime
    processed_at: Optional[datetime]
    approved_at: Optional[datetime]
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    published_message_id: Optional[int]
    admin_notes: Optional[str]
    approved_by: Optional[int]
    
    # Relationships
    source_channel: Optional[SourceChannel] = None
    target_channel: Optional[TargetChannel] = None
    approver: Optional[User] = None
    
    class Config:
        from_attributes = True


# Settings schemas
class SettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class Setting(SettingBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Dashboard schemas
class DashboardStats(BaseModel):
    total_source_channels: int
    active_source_channels: int
    total_target_channels: int
    active_target_channels: int
    pending_posts: int
    approved_posts: int
    rejected_posts: int
    published_posts: int
    posts_today: int


# AI Model schemas
class AIModelBase(BaseModel):
    name: str
    model_id: str
    description: Optional[str] = None


class AIModelCreate(AIModelBase):
    pass

class AIModelUpdate(BaseModel):
    name: Optional[str] = None
    model_id: Optional[str] = None
    provider: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


# Service Status Schemas
class ServiceStatus(BaseModel):
    is_running: bool
    should_run: bool
    last_heartbeat: Optional[datetime] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ServiceControl(BaseModel):
    action: str  # "start" or "stop"


class AIModel(AIModelBase):
    id: int
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Response schemas
class MessageResponse(BaseModel):
    message: str


class ListResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int


# Telegram session generation schemas
class SessionGenerationStart(BaseModel):
    phone_number: str


class SessionGenerationVerify(BaseModel):
    session_id: str
    code: str
    password: Optional[str] = None