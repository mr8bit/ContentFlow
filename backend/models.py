from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum

Base = declarative_base()


class PostStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SourceChannel(Base):
    __tablename__ = "source_channels"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(String, unique=True, index=True, nullable=False)
    channel_name = Column(String, nullable=False)
    channel_username = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    check_interval = Column(Integer, default=5)  # seconds
    last_checked = Column(DateTime(timezone=True), nullable=True)
    last_message_id = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    posts = relationship("Post", back_populates="source_channel")


class TargetChannel(Base):
    __tablename__ = "target_channels"
    
    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(String, unique=True, index=True, nullable=False)
    channel_name = Column(String, nullable=False)
    channel_username = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    posts = relationship("Post", back_populates="target_channel")


class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    source_channel_id = Column(Integer, ForeignKey("source_channels.id"), nullable=True)
    target_channel_id = Column(Integer, ForeignKey("target_channels.id"), nullable=True)
    
    # Original post data
    original_message_id = Column(Integer, nullable=False)
    original_text = Column(Text, nullable=True)
    original_media = Column(JSON, nullable=True)  # Store media info as JSON
    
    # Processed post data
    processed_text = Column(Text, nullable=True)
    
    # Manual post flag
    is_manual = Column(Boolean, default=False, nullable=False)
    
    # Status and timestamps
    status = Column(String, default=PostStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    published_message_id = Column(Integer, nullable=True)
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    source_channel = relationship("SourceChannel", back_populates="posts")
    target_channel = relationship("TargetChannel", back_populates="posts")
    approver = relationship("User")


class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class AIModel(Base):
    __tablename__ = "ai_models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    model_id = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class WorkerStatus(Base):
    __tablename__ = "worker_status"
    
    id = Column(Integer, primary_key=True, index=True)
    is_running = Column(Boolean, default=False)
    should_run = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ScrapperStatus(Base):
    __tablename__ = "scrapper_status"
    
    id = Column(Integer, primary_key=True, index=True)
    is_running = Column(Boolean, default=False)
    should_run = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PublisherStatus(Base):
    __tablename__ = "publisher_status"
    
    id = Column(Integer, primary_key=True, index=True)
    is_running = Column(Boolean, default=False)
    should_run = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())