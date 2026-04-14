from pydantic import BaseModel, HttpUrl
from typing import Optional

from app.models.schemas import Quality


class BasePlatformDownloadIn(BaseModel):
    url: HttpUrl
    quality: Quality = Quality.HIGH
    extract_audio: bool = False
    include_metadata: bool = True


class InstagramDownloadIn(BasePlatformDownloadIn):
    pass


class TikTokDownloadIn(BasePlatformDownloadIn):
    pass


class FacebookDownloadIn(BasePlatformDownloadIn):
    pass


class RedditDownloadIn(BasePlatformDownloadIn):
    pass


class PinterestDownloadIn(BasePlatformDownloadIn):
    pass


class TwitterDownloadIn(BasePlatformDownloadIn):
    pass


class YouTubeDownloadIn(BasePlatformDownloadIn):
    pass


class StoryDownloadIn(BaseModel):
    url: HttpUrl
    quality: Quality = Quality.HIGH
    include_metadata: bool = True
    # Some story/status downloads require login cookies:
    # configure SMD_YTDLP_COOKIEFILE in .env
    note: Optional[str] = None
