from pydantic import BaseModel, HttpUrl, Field, field_validator
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import datetime
import re

class Platform(str, Enum):
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    FACEBOOK = "facebook"
    REDDIT = "reddit"
    PINTEREST = "pinterest"
    TWITTER = "twitter"
    X = "x"
    YOUTUBE = "youtube"
    WHATSAPP = "whatsapp"
    WHATSAPP_BUSINESS = "whatsapp_business"
    TELEGRAM = "telegram"
    LINKEDIN = "linkedin"
    THREADS = "threads"
    TWITCH = "twitch"
    VIMEO = "vimeo"
    DAILYMOTION = "dailymotion"
    SPOTIFY = "spotify"
    SOUNDCLOUD = "soundcloud"

class MediaType(str, Enum):
    """Media types for downloaded content - FIXED to match Instagram API"""
    VIDEO = "video"
    IMAGE = "image"
    PHOTO = "photo"  # Added for compatibility with photo posts
    AUDIO = "audio"
    STORY = "story"
    STATUS = "status"
    REEL = "reel"
    POST = "post"
    CAROUSEL = "carousel"
    ALBUM = "album"  # Added for carousel/album posts
    PROFILE_PICTURE = "profile_picture"
    HIGHLIGHT = "highlight"
    LIVE = "live"
    UNKNOWN = "unknown"  # Added for fallback

class Quality(str, Enum):
    LOWEST = "lowest"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    HIGHEST = "highest"
    AUDIO_ONLY = "audio_only"
    VIDEO_ONLY = "video_only"
    
    # Specific resolutions
    P144 = "144p"
    P240 = "240p"
    P360 = "360p"
    P480 = "480p"
    P720 = "720p"
    P1080 = "1080p"
    P1440 = "1440p"
    P2160 = "2160p"  # 4K
    P4320 = "4320p"  # 8K

class DownloadStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class UserAuth(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    session_id: Optional[str] = None
    cookies: Optional[Dict[str, str]] = None
    token: Optional[str] = None
    qr_code: Optional[str] = None

class DownloadRequest(BaseModel):
    url: HttpUrl
    platform: Optional[Platform] = None
    media_type: Optional[MediaType] = None
    quality: Quality = Quality.HIGH
    include_metadata: bool = True
    download_thumbnails: bool = False
    extract_audio: bool = False
    max_height: Optional[int] = None
    max_width: Optional[int] = None
    preferred_format: Optional[str] = None
    user_auth: Optional[UserAuth] = None
    webhook_url: Optional[HttpUrl] = None
    
    @field_validator('url')
    def validate_url(cls, v):
        url_str = str(v)
        # Check if it's a valid social media URL
        social_patterns = [
            r'instagram\.com',
            r'tiktok\.com',
            r'facebook\.com',
            r'fb\.com',
            r'reddit\.com',
            r'redd\.it',
            r'pinterest\.com',
            r'pin\.it',
            r'pinimg\.com',
            r'twitter\.com',
            r'x\.com',
            r'youtube\.com',
            r'youtu\.be',
            r'whatsapp\.com',
            r'telegram\.org',
            r't\.me',
        ]
        if not any(re.search(pattern, url_str.lower()) for pattern in social_patterns):
            raise ValueError('URL must be from a supported social media platform')
        return v

class MediaInfo(BaseModel):
    id: str
    platform: Platform
    media_type: MediaType
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    download_url: Optional[str] = None
    
    # Media details
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    file_format: Optional[str] = None
    bitrate: Optional[int] = None
    fps: Optional[int] = None
    
    # Author info
    author_id: Optional[str] = None
    author_username: Optional[str] = None
    author_display_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    
    # Metadata
    created_at: Optional[datetime] = None
    uploaded_at: Optional[datetime] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None
    share_count: Optional[int] = None
    
    # Available qualities
    available_qualities: List[Quality] = []
    available_formats: List[str] = []
    
    # Audio specific
    audio_bitrate: Optional[int] = None
    audio_channels: Optional[int] = None
    audio_sample_rate: Optional[int] = None
    
    class Config:
        from_attributes = True
        use_enum_values = True  # This ensures enum values are used as strings

class DownloadResponse(BaseModel):
    success: bool
    message: str
    download_id: Optional[str] = None
    status: DownloadStatus
    media_info: Optional[MediaInfo] = None
    download_url: Optional[str] = None
    downloads: Optional[Dict[str, Any]] = None  # Changed to Any to handle complex objects
    expires_at: Optional[datetime] = None
    error: Optional[str] = None
    warnings: List[str] = []
    
    class Config:
        from_attributes = True
        use_enum_values = True

class BatchDownloadRequest(BaseModel):
    urls: List[HttpUrl]
    quality: Quality = Quality.HIGH
    include_metadata: bool = True
    webhook_url: Optional[HttpUrl] = None

class BatchDownloadResponse(BaseModel):
    batch_id: str
    total_items: int
    successful: int
    failed: int
    downloads: List[DownloadResponse]
    created_at: datetime

class PlatformStatus(BaseModel):
    platform: Platform
    is_available: bool
    requires_auth: bool
    is_authenticated: bool
    rate_limit_remaining: Optional[int] = None
    rate_limit_reset: Optional[datetime] = None
    error: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    followers_count: Optional[int] = None
    following_count: Optional[int] = None
    post_count: Optional[int] = None
    is_verified: bool = False
    platform: Platform
    profile_url: str

# Add this helper function to convert string to MediaType
def get_media_type(media_type_str: str) -> MediaType:
    """Convert string to MediaType enum with proper mapping"""
    media_type_map = {
        'video': MediaType.VIDEO,
        'image': MediaType.IMAGE,
        'photo': MediaType.PHOTO,
        'carousel': MediaType.CAROUSEL,
        'album': MediaType.ALBUM,
        'story': MediaType.STORY,
        'reel': MediaType.REEL,
        'post': MediaType.POST,
        'audio': MediaType.AUDIO,
        'status': MediaType.STATUS,
        'highlight': MediaType.HIGHLIGHT,
        'live': MediaType.LIVE,
        'profile_picture': MediaType.PROFILE_PICTURE,
    }
    
    # Try to get the enum value, default to UNKNOWN
    media_type_str_lower = media_type_str.lower() if media_type_str else 'unknown'
    return media_type_map.get(media_type_str_lower, MediaType.UNKNOWN)