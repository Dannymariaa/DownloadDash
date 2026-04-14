from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, JSON, ForeignKey, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.sql import func
import uuid
from datetime import datetime
import json

from app.config import settings

# Async engine for production
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(
        settings.get_database_url(),
        echo=settings.DEBUG,
        future=True
    )
else:
    engine = create_async_engine(
        settings.get_database_url(),
        echo=settings.DEBUG,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        future=True
    )

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # API usage
    daily_download_count = Column(Integer, default=0)
    total_download_count = Column(Integer, default=0)
    last_download_reset = Column(DateTime(timezone=True), default=func.now())
    
    # Relationships
    downloads = relationship("Download", back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")
    platform_auths = relationship("PlatformAuth", back_populates="user")

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    user_id = Column(String, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Rate limiting per key
    requests_per_minute = Column(Integer, default=60)
    downloads_per_day = Column(Integer, default=100)
    
    user = relationship("User", back_populates="api_keys")

class Download(Base):
    __tablename__ = "downloads"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    url = Column(Text, nullable=False)
    platform = Column(String, nullable=False)
    media_type = Column(String)
    status = Column(String, default="pending")
    quality = Column(String)
    file_path = Column(String)
    file_size = Column(Integer)
    file_format = Column(String)
    duration = Column(Float)
    
    # Metadata
    title = Column(String)
    author = Column(String)
    thumbnail_url = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="downloads")
    
    # Indexes
    __table_args__ = (
        Index('idx_downloads_user_created', 'user_id', 'created_at'),
        Index('idx_downloads_status', 'status'),
        Index('idx_downloads_platform', 'platform'),
    )

class PlatformAuth(Base):
    __tablename__ = "platform_auths"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    platform = Column(String, nullable=False)
    auth_type = Column(String)  # oauth, password, qr, cookie
    credentials = Column(JSON)  # Encrypted credentials
    is_valid = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="platform_auths")

class Webhook(Base):
    __tablename__ = "webhooks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    url = Column(Text, nullable=False)
    events = Column(JSON)  # List of events to trigger on
    secret = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Statistics
    total_calls = Column(Integer, default=0)
    successful_calls = Column(Integer, default=0)
    last_called = Column(DateTime(timezone=True))

class RateLimit(Base):
    __tablename__ = "rate_limits"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, index=True)  # Can be user_id, api_key, or IP
    endpoint = Column(String)
    requests = Column(Integer, default=0)
    window_start = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_rate_limit_key_window', 'key', 'window_start'),
    )

# Create indexes
from sqlalchemy import Index

# Async database session dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Sync engine for migrations
sync_engine = create_engine(
    settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", ""),
    echo=settings.DEBUG
)
SyncSessionLocal = sessionmaker(bind=sync_engine)