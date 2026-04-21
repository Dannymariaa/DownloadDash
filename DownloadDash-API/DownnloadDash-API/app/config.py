import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Social Media Downloader API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    API_KEY: Optional[str] = None
    REQUIRE_API_KEY: bool = False
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./social_downloader.db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # File Storage
    DOWNLOAD_PATH: str = "./downloads"
    TEMP_PATH: str = "./temp"
    MAX_FILE_SIZE_MB: int = 500
    MAX_STORAGE_GB: int = 50
    CLEANUP_INTERVAL_HOURS: int = 24
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    DAILY_DOWNLOAD_LIMIT: int = 1000

    # yt-dlp (optional)
    # Export browser cookies to a Netscape cookies file and set this path to enable
    # downloads that require login (e.g. stories).
    YTDLP_COOKIEFILE: Optional[str] = None
    YTDLP_COOKIE_DATA: Optional[str] = None
    YTDLP_PROXY: Optional[str] = None
    
    # Platform API Keys
    INSTAGRAM_USERNAME: Optional[str] = None
    INSTAGRAM_PASSWORD: Optional[str] = None

    # WhatsApp bridge URLs
    WHATSAPP_BRIDGE_URL: str = "http://127.0.0.1:3001"
    WHATSAPP_BUSINESS_BRIDGE_URL: str = "http://127.0.0.1:3005"
    
    TELEGRAM_API_ID: Optional[int] = None
    TELEGRAM_API_HASH: Optional[str] = None
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    
    TWITTER_BEARER_TOKEN: Optional[str] = None
    
    YOUTUBE_API_KEY: Optional[str] = None
    
    # Webhook Settings
    WEBHOOK_BASE_URL: Optional[str] = None
    WEBHOOK_SECRET: str = "webhook-secret-change-me"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://downloaddash.store",
        "https://www.downloaddash.store",
    ]
    BACKEND_CORS_ORIGIN_REGEX: Optional[str] = (
        r"https://([a-z0-9-]+\.)?downloaddash\.store|https://([a-z0-9-]+\.)?vercel\.app"
    )
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"
    
    # Worker Settings
    MAX_WORKERS: int = 4
    DOWNLOAD_TIMEOUT_SECONDS: int = 300
    
    model_config = ConfigDict(
        env_prefix="SMD_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    def get_database_url(self) -> str:
        """Get database URL with async driver"""
        if self.DATABASE_URL.startswith("postgresql"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
        return self.DATABASE_URL

settings = Settings()

# Create necessary directories
os.makedirs(settings.TEMP_PATH, exist_ok=True)
os.makedirs("./logs", exist_ok=True)
