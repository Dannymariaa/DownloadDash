from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional
from typing import ClassVar
import re
from urllib.parse import urlsplit

from app.models.schemas import Quality, validate_public_media_url


class BasePlatformDownloadIn(BaseModel):
    expected_platform: ClassVar[str | None] = None
    url: HttpUrl
    quality: Quality = Quality.HIGH
    extract_audio: bool = False
    include_metadata: bool = True

    @field_validator("url")
    @classmethod
    def validate_public_url(cls, value):
        value = validate_public_media_url(value)
        expected = cls.expected_platform
        if expected:
            host = (urlsplit(str(value)).hostname or "").lower().rstrip(".")
            roots = {
                "instagram": ("instagram.com",),
                "tiktok": ("tiktok.com",),
                "facebook": ("facebook.com", "fb.com", "fb.watch"),
                "reddit": ("reddit.com", "redd.it"),
                "pinterest": ("pinterest.com", "pin.it"),
                "x": ("x.com", "twitter.com"),
                "youtube": ("youtube.com", "youtu.be"),
            }.get(expected, ())
            if not any(host == root or host.endswith("." + root) for root in roots):
                raise ValueError(f"URL must be from {expected}")
            path = urlsplit(str(value)).path or "/"
            query = urlsplit(str(value)).query
            media_path = {
                "instagram": bool(re.match(r"^/(p|reel|reels|stories|tv)/", path, re.I)),
                "tiktok": host in {"vm.tiktok.com", "vt.tiktok.com"} and len(path) > 1
                or bool(re.match(r"^/@[^/]+/(video|photo)/[^/]+", path, re.I)),
                "facebook": bool(re.match(r"^/(share/(p|v)|reel|watch|stories|story\.php|photo|photo\.php|permalink\.php|posts|videos)\b", path, re.I))
                or "v=" in query or "story_fbid=" in query or "fbid=" in query,
                "reddit": host == "redd.it" and len(path) > 1
                or bool(re.match(r"^/r/[^/]+/(s/[^/]+|comments/[^/]+)", path, re.I)),
                "pinterest": host == "pin.it" and len(path) > 1 or bool(re.match(r"^/pin/\d+", path, re.I)),
                "x": bool(re.search(r"/status/\d+", path, re.I)),
                "youtube": host == "youtu.be" and len(path) > 1
                or bool((path == "/watch" and "v=" in query) or re.match(r"^/(shorts|live)/[^/]+", path, re.I)),
            }.get(expected, False)
            if not media_path:
                raise ValueError(f"URL must identify a public {expected} media item")
        return value


class InstagramDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "instagram"


class TikTokDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "tiktok"


class FacebookDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "facebook"


class RedditDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "reddit"


class PinterestDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "pinterest"


class TwitterDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "x"


class YouTubeDownloadIn(BasePlatformDownloadIn):
    expected_platform: ClassVar[str] = "youtube"


class StoryDownloadIn(BaseModel):
    url: HttpUrl
    quality: Quality = Quality.HIGH
    include_metadata: bool = True
    # Some story/status downloads require login cookies:
    # configure SMD_YTDLP_COOKIEFILE in .env
    note: Optional[str] = None
