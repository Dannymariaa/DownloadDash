import uuid
from datetime import datetime, timedelta
import time
from typing import Any, Dict, Optional

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
from app.state import gallery_downloader, public_downloader, universal_downloader


GALLERY_FALLBACK_PLATFORMS = {
    Platform.INSTAGRAM,
    Platform.TIKTOK,
    Platform.FACEBOOK,
    Platform.REDDIT,
    Platform.PINTEREST,
    Platform.TWITTER,
    Platform.X,
    Platform.YOUTUBE,
}

RESOLVE_CACHE_TTL_SECONDS = 600
_resolve_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}


def _resolve_cache_key(platform: Platform, request: DownloadRequest) -> str:
    return "|".join(
        [
            platform.value,
            str(request.url),
            str(request.quality),
            str(bool(request.extract_audio)),
            str(request.media_type or ""),
        ]
    )


def _get_resolve_cache(key: str) -> Optional[Dict[str, Any]]:
    cached = _resolve_cache.get(key)
    if not cached:
        return None
    expires_at, value = cached
    if expires_at <= time.time():
        _resolve_cache.pop(key, None)
        return None
    print(f"Info: resolve_cache_hit key={key[:120]}")
    return value


def _set_resolve_cache(key: str, value: Dict[str, Any]) -> None:
    if len(_resolve_cache) > 512:
        now = time.time()
        for cache_key, (expires_at, _) in list(_resolve_cache.items()):
            if expires_at <= now:
                _resolve_cache.pop(cache_key, None)
        while len(_resolve_cache) > 384:
            _resolve_cache.pop(next(iter(_resolve_cache)))
    _resolve_cache[key] = (time.time() + RESOLVE_CACHE_TTL_SECONDS, value)


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


def _kind_from_gallery_item(item: Dict[str, Any]) -> str:
    media_type = (item.get("media_type") or "").lower()
    ext = (item.get("extension") or "").lower()
    if media_type in {"video", "audio", "image"}:
        return media_type
    if ext in {"mp4", "mov", "webm", "m4v"}:
        return "video"
    if ext in {"mp3", "m4a", "aac", "ogg", "wav"}:
        return "audio"
    if ext in {"jpg", "jpeg", "png", "webp", "gif"}:
        return "image"
    return "unknown"


def _gallery_result_to_universal(
    platform: Platform,
    url: str,
    gallery_result: Dict[str, Any],
    extract_audio: bool = False,
) -> Optional[Dict[str, Any]]:
    raw_items = gallery_result.get("items") or []
    items = []
    for item in raw_items:
        if isinstance(item, dict):
            item_url = item.get("url") or item.get("download_url") or item.get("src")
            if not item_url:
                continue
            enriched = {**item, "url": item_url}
            items.append(enriched)
        elif isinstance(item, str):
            items.append({"url": item})

    if not items:
        return None

    for item in items:
        item["kind"] = _kind_from_gallery_item(item)

    if extract_audio:
        primary = next((item for item in items if item["kind"] == "audio"), None)
    else:
        primary = next((item for item in items if item["kind"] == "video"), None)
    primary = primary or next((item for item in items if item["kind"] == "image"), None) or items[0]
    kind = primary.get("kind") or "unknown"

    downloads: Dict[str, Any] = {}
    video = next((item for item in items if item["kind"] == "video"), None)
    audio = next((item for item in items if item["kind"] == "audio"), None)
    image = next((item for item in items if item["kind"] == "image"), None)

    if video:
        downloads["videoHD"] = video["url"]
        downloads["videoSD"] = video["url"]
    if audio:
        downloads["audio"] = audio["url"]
    if image:
        downloads["image"] = image["url"]
    if len(items) > 1:
        downloads["items"] = [
            {
                "url": item["url"],
                "type": item.get("kind") or item.get("media_type") or "file",
                "filename": item.get("filename"),
                "extension": item.get("extension"),
                "width": item.get("width"),
                "height": item.get("height"),
            }
            for item in items
        ]

    return {
        "direct_url": primary["url"],
        "title": primary.get("title") or f"{platform.value.title()} media",
        "thumbnail": (image or primary).get("url"),
        "ext": primary.get("extension"),
        "filesize": None,
        "kind": kind if kind in {"video", "audio", "image"} else "video",
        "downloads": downloads,
        "warnings": gallery_result.get("warnings") or [],
        "source": "gallery-dl",
    }


async def _resolve_with_gallery_fallback(
    platform: Platform,
    url: str,
    extract_audio: bool = False,
) -> Optional[Dict[str, Any]]:
    if platform not in GALLERY_FALLBACK_PLATFORMS:
        return None
    try:
        gallery_result = await gallery_downloader.resolve(url, limit=50)
    except Exception as e:
        print(f"Warning: gallery-dl fallback failed for {platform}: {e}")
        return None
    return _gallery_result_to_universal(platform, url, gallery_result, extract_audio=extract_audio)


async def download_public(
    platform: Platform, request: DownloadRequest, background_tasks: BackgroundTasks
) -> DownloadResponse:
    url_str = str(request.url)
    cache_key = _resolve_cache_key(platform, request)
    result = _get_resolve_cache(cache_key)
    resolve_error: Optional[Exception] = None

    if result is None:
        print(f"Info: resolve_cache_miss platform={platform.value} url={url_str}")
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
            resolve_error = e
            result = None

    if not result or not result.get("direct_url"):
        gallery_result = await _resolve_with_gallery_fallback(
            platform=platform,
            url=url_str,
            extract_audio=request.extract_audio,
        )
        if gallery_result:
            result = gallery_result

    if result and result.get("direct_url"):
        _set_resolve_cache(cache_key, result)

    if not result:
        return DownloadResponse(
            success=False,
            message="Resolve failed",
            status=DownloadStatus.FAILED,
            error=str(resolve_error) if resolve_error else "No media resolver returned a result",
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
    warnings = list(result.get("warnings") or [])

    raw_download_items = []
    for source_items in (
        downloads.get("items"),
        downloads.get("images"),
        downloads.get("photos"),
        result.get("items"),
        result.get("images"),
        result.get("photos"),
    ):
        if isinstance(source_items, list):
            raw_download_items.extend(source_items)

    image_items = []
    seen_item_urls = set()
    for item in raw_download_items:
        if isinstance(item, str):
            item_url = item
            item_type = "image"
            normalized = {"url": item_url, "type": item_type}
        elif isinstance(item, dict):
            item_url = item.get("url") or item.get("download_url") or item.get("src")
            if not item_url:
                continue
            normalized = {
                "url": item_url,
                "type": item.get("type") or item.get("kind") or item.get("media_type") or "image",
                "filename": item.get("filename"),
                "extension": item.get("extension") or item.get("ext"),
                "width": item.get("width"),
                "height": item.get("height"),
            }
        else:
            continue

        if item_url in seen_item_urls:
            continue
        seen_item_urls.add(item_url)
        image_items.append(normalized)

    if image_items:
        downloads["items"] = image_items
        downloads["image"] = downloads.get("image") or image_items[0]["url"]
        if len(image_items) > 1 and kind in {"image", "album", "carousel", "post", "unknown"}:
            kind = "album"

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

    if not direct_url:
        direct_url = downloads.get("videoHD") or downloads.get("videoSD") or downloads.get("audio") or downloads.get("image")

    if not direct_url:
        return DownloadResponse(
            success=False,
            message="Resolve failed",
            status=DownloadStatus.FAILED,
            error="Resolve failed: no direct URL found after yt-dlp and gallery-dl fallback",
            warnings=warnings,
        )

    media_type = request.media_type

    if platform == Platform.YOUTUBE and kind == "image":
        raise HTTPException(
            status_code=502,
            detail=(
                "YouTube resolve returned only an image thumbnail/cover. "
                "Video/audio downloads are required and the proxy or yt-dlp resolver must be fixed."
            ),
        )

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
        warnings=warnings,
    )
