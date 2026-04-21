import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import BackgroundTasks, HTTPException

from app.config import settings
from app.models.schemas import (
    DownloadRequest,
    DownloadResponse,
    DownloadStatus,
    MediaInfo,
    MediaType,
    Platform,
)
from app.state import public_downloader, universal_downloader


def detect_platform(url: str) -> Optional[Platform]:
    url_lower = url.lower()

    platform_patterns = {
        Platform.INSTAGRAM: ["instagram.com", "instagr.am"],
        Platform.TIKTOK: ["tiktok.com"],
        Platform.FACEBOOK: ["facebook.com", "fb.com", "fb.watch"],
        Platform.REDDIT: ["reddit.com", "redd.it"],
        Platform.PINTEREST: ["pinterest.com", "pin.it", "pinimg.com", "i.pinimg.com"],
        Platform.TWITTER: ["twitter.com"],
        Platform.X: ["x.com"],
        Platform.YOUTUBE: ["youtube.com", "youtu.be"],
        Platform.WHATSAPP: ["whatsapp.com"],
        Platform.TELEGRAM: ["t.me", "telegram.org"],
    }

    for platform, patterns in platform_patterns.items():
        if any(pattern in url_lower for pattern in patterns):
            return platform

    return None


async def download_public(
    platform: Platform, request: DownloadRequest, background_tasks: BackgroundTasks
) -> DownloadResponse:
    url_str = str(request.url)

    try:
        result = await universal_downloader.resolve_media(
            url=url_str,
            platform=platform,
            quality=request.quality,
            extract_audio=request.extract_audio,
            media_type=request.media_type,
            user_auth=request.user_auth,
        )
    except Exception as e:
        return DownloadResponse(
            success=False,
            message="Resolve failed",
            status=DownloadStatus.FAILED,
            error=str(e),
            warnings=[],
        )

    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if result.get("filesize") and result.get("filesize", 0) > max_size_bytes:
        raise HTTPException(status_code=413, detail="File too large")

    download_id = str(uuid.uuid4())

    downloads = dict(result.get("downloads") or {})
    direct_url = result.get("direct_url")
    thumbnail = result.get("thumbnail")
    kind = (result.get("kind") or "").lower()

    # Normalize download keys so frontend always gets a stable shape.
    if downloads.get("video") and not downloads.get("videoHD"):
        downloads["videoHD"] = downloads["video"]
    if downloads.get("video") and not downloads.get("videoSD"):
        downloads["videoSD"] = downloads["video"]
    if downloads.get("audio_url") and not downloads.get("audio"):
        downloads["audio"] = downloads["audio_url"]
    if kind == "video" and direct_url and not (downloads.get("videoHD") or downloads.get("videoSD")):
        downloads["videoHD"] = direct_url
        downloads["videoSD"] = direct_url
    if kind == "audio" and direct_url and not downloads.get("audio"):
        downloads["audio"] = direct_url
    if kind == "image" and not downloads.get("image"):
        downloads["image"] = direct_url or thumbnail

    media_type = request.media_type
    if not media_type:
        if request.extract_audio:
            media_type = MediaType.AUDIO
        else:
            # Prefer image when the resolved payload is clearly an image.
            ext = (result.get("ext") or "").lower()
            has_video = bool(downloads.get("videoHD") or downloads.get("videoSD") or downloads.get("video"))
            has_audio = bool(downloads.get("audio"))
            has_image = bool(downloads.get("image"))
            if kind == "audio" or (has_audio and not has_video and not has_image):
                media_type = MediaType.AUDIO
            elif kind == "image" or (has_image and not has_video) or ext in ("jpg", "jpeg", "png", "webp"):
                media_type = MediaType.IMAGE
            else:
                media_type = MediaType.VIDEO

    media_info = MediaInfo(
        id=download_id,
        platform=platform,
        media_type=media_type,
        url=url_str,
        title=result.get("title"),
        thumbnail_url=thumbnail,
        download_url=downloads.get("videoHD") or downloads.get("audio") or downloads.get("image") or direct_url,
        file_size=result.get("filesize"),
        file_format=result.get("ext"),
    )

    return DownloadResponse(
        success=True,
        message="Resolved successfully",
        download_id=download_id,
        status=DownloadStatus.COMPLETED,
        media_info=media_info,
        download_url=downloads.get("videoHD") or downloads.get("audio") or downloads.get("image") or direct_url,
        downloads=downloads or None,
        expires_at=datetime.utcnow() + timedelta(hours=1),
        warnings=[],
    )
