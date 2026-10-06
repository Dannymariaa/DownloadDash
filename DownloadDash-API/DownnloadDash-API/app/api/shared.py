import asyncio
import copy
import hashlib
import json
import uuid
from datetime import datetime, timedelta
import time
from typing import Any, Dict, Optional

from fastapi import BackgroundTasks, HTTPException

from app.api.cookie_state import inspect_netscape_cookiefile
from app.api.resolver_errors import TERMINAL_PROVIDER_ERRORS, classify_resolver_error, sanitize_provider_error
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
from app.platforms.egress import egress_policy, public_resolution, public_metadata, cache_ttl, reused_metrics, ProxyMetrics


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

_resolve_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}
_resolve_inflight: Dict[str, asyncio.Task] = {}
_resolver_semaphore: asyncio.Semaphore | None = None
_resolver_semaphore_limit: int | None = None
_resolver_semaphore_loop: asyncio.AbstractEventLoop | None = None


def _get_resolver_semaphore() -> asyncio.Semaphore:
    global _resolver_semaphore, _resolver_semaphore_limit, _resolver_semaphore_loop
    loop = asyncio.get_running_loop()
    limit = max(1, int(getattr(settings, "RESOLVER_CONCURRENCY", 4)))
    if (
        _resolver_semaphore is None
        or _resolver_semaphore_limit != limit
        or _resolver_semaphore_loop is not loop
    ):
        _resolver_semaphore = asyncio.Semaphore(limit)
        _resolver_semaphore_limit = limit
        _resolver_semaphore_loop = loop
    return _resolver_semaphore


async def _run_bounded_metadata_resolve(
    *, platform: Platform, request: DownloadRequest, url: str
) -> Dict[str, Any]:
    timeout_seconds = (
        settings.YOUTUBE_RESOLVER_TIMEOUT_SECONDS if platform == Platform.YOUTUBE
        else settings.RESOLVER_TIMEOUT_SECONDS
    )
    deadline = time.monotonic() + float(timeout_seconds)

    async def direct():
        result, error = None, None
        try:
            result = await universal_downloader.resolve_media(
                url=url,
                platform=platform,
                quality=request.quality,
                extract_audio=request.extract_audio,
                media_type=request.media_type,
                user_auth=request.user_auth,
            )
        except Exception as exc:
            error = exc
            if classify_resolver_error(platform, str(exc)) in TERMINAL_PROVIDER_ERRORS:
                raise
        if _should_try_gallery_enrichment(platform, url, result, request.extract_audio) or not result or not result.get('direct_url'):
            gallery = await _resolve_with_gallery_fallback(platform, url, request.extract_audio)
            if gallery and (not result or _gallery_result_is_richer(result, gallery)):
                result = gallery
        if not result or not result.get('direct_url'):
            raise error or RuntimeError((result or {}).get('error') or 'EXTRACTOR_FAILED')
        return result

    async def proxy(metrics):
        return await public_downloader.resolve_proxy_metadata(url, request.quality, request.extract_audio, metrics)

    async def run_in_slot() -> Dict[str, Any]:
        async with _get_resolver_semaphore():
            token = public_resolution.set(_is_public_cacheable_request(request))
            try:
                if not _is_public_cacheable_request(request):
                    return await direct()
                return await egress_policy.resolve(platform, direct,
                    proxy if public_downloader._proxy_for_url(url) else None, deadline=deadline)
            finally:
                public_resolution.reset(token)

    provider_task = asyncio.create_task(run_in_slot())
    try:
        return await asyncio.wait_for(
            asyncio.shield(provider_task),
            timeout=max(0.01, float(timeout_seconds)),
        )
    except asyncio.TimeoutError:
        # Shielding preserves the semaphore slot until executor backed provider work exits.
        provider_task.add_done_callback(
            lambda task: task.exception() if not task.cancelled() else None
        )
        raise


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


def _is_public_cacheable_request(request: DownloadRequest) -> bool:
    return request.user_auth is None


def _get_resolve_cache(key: str) -> Optional[Dict[str, Any]]:
    cached = _resolve_cache.get(key)
    if not cached:
        return None
    expires_at, value = cached
    if expires_at <= time.time():
        _resolve_cache.pop(key, None)
        return None
    print(f"Info: resolve_cache_hit cacheKeyHash={_cache_key_hash(key)}")
    result = copy.deepcopy(value)
    result['egress'] = reused_metrics(result.get('egress', {}))
    return result


def _set_resolve_cache(key: str, value: Dict[str, Any]) -> None:
    if len(_resolve_cache) > 512:
        now = time.time()
        for cache_key, (expires_at, _) in list(_resolve_cache.items()):
            if expires_at <= now:
                _resolve_cache.pop(cache_key, None)
        while len(_resolve_cache) > 384:
            _resolve_cache.pop(next(iter(_resolve_cache)))
    ttl = cache_ttl(value, maximum=min(240, max(1, int(getattr(settings, "RESOLVE_CACHE_TTL_SECONDS", 600)))))
    if ttl:
        _resolve_cache[key] = (time.time() + ttl, copy.deepcopy(public_metadata(value)))


def _cache_key_hash(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]


def _elapsed_ms(started_at: float) -> int:
    return max(0, int((time.perf_counter() - started_at) * 1000))


def _result_count(result: Optional[Dict[str, Any]]) -> int:
    return _download_item_count(result)


def _timing_payload(
    *,
    platform: Platform,
    cache_hit: bool,
    single_flight: bool,
    queue_wait_ms: int,
    provider_resolve_ms: int,
    normalization_ms: int,
    total_ms: int,
    result_count: int,
    error_code: str | None = None,
    request_id: str | None = None,
) -> Dict[str, Any]:
    return {
        "requestId": request_id,
        "platform": platform.value,
        "cacheHit": cache_hit,
        "singleFlight": single_flight,
        "validationMs": 0,
        "routingMs": 0,
        "vercelMs": 0,
        "backendQueueMs": queue_wait_ms,
        "queueWaitMs": queue_wait_ms,
        "renderQueueMs": queue_wait_ms,
        "extractorStartupMs": 0,
        "providerMs": provider_resolve_ms,
        "providerResolveMs": provider_resolve_ms,
        "resolveMs": provider_resolve_ms,
        "normalizationMs": normalization_ms,
        "responseMs": total_ms,
        "totalMs": total_ms,
        "resultCount": result_count,
        "errorCode": error_code,
    }


def _log_timing(event: str, *, cache_key: str, timing: Dict[str, Any]) -> None:
    payload = {
        "event": event,
        "cacheKeyHash": _cache_key_hash(cache_key),
        **timing,
    }
    print("Info: public_resolve_timing " + json.dumps(payload, separators=(",", ":")))


def _promote_x_cookie_error(platform: Platform, url: str, error_code: str) -> str:
    if platform not in (Platform.TWITTER, Platform.X) or error_code != "COOKIE_REQUIRED":
        return error_code
    cookie_state = inspect_netscape_cookiefile(public_downloader._cookiefile_for_url(url))
    if cookie_state.get("expired") == "YES":
        return "COOKIE_EXPIRED"
    return error_code


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


def _download_item_count(result: Optional[Dict[str, Any]]) -> int:
    if not result:
        return 0
    downloads = result.get("downloads") or {}
    for source_items in (
        downloads.get("items"),
        downloads.get("images"),
        downloads.get("photos"),
        result.get("items"),
        result.get("images"),
        result.get("photos"),
    ):
        if isinstance(source_items, list) and source_items:
            return len(source_items)
    return 1 if result.get("direct_url") else 0


def _should_try_gallery_enrichment(
    platform: Platform,
    url: str,
    result: Optional[Dict[str, Any]],
    extract_audio: bool = False,
) -> bool:
    if platform != Platform.INSTAGRAM or extract_audio or not result:
        return False
    if "/p/" not in url.lower():
        return False
    return (result.get("kind") or "").lower() == "image" and _download_item_count(result) <= 1


def _gallery_result_is_richer(current: Optional[Dict[str, Any]], gallery_result: Optional[Dict[str, Any]]) -> bool:
    if not gallery_result or not gallery_result.get("direct_url"):
        return False
    current_count = _download_item_count(current)
    gallery_count = _download_item_count(gallery_result)
    if gallery_count > current_count:
        return True
    current_kind = ((current or {}).get("kind") or "").lower()
    gallery_kind = (gallery_result.get("kind") or "").lower()
    return current_kind == "image" and gallery_kind in {"video", "audio"}


async def _resolve_with_gallery_fallback(
    platform: Platform,
    url: str,
    extract_audio: bool = False,
) -> Optional[Dict[str, Any]]:
    if platform not in GALLERY_FALLBACK_PLATFORMS:
        return None
    try:
        gallery_result = await gallery_downloader.resolve(
            url,
            limit=50,
            timeout_seconds=max(1.0, float(getattr(settings, "GALLERY_FALLBACK_TIMEOUT_SECONDS", 8.0))),
        )
    except Exception as e:
        print(f"Warning: gallery-dl fallback failed for {platform}: {sanitize_provider_error(str(e))[:300]}")
        return None
    return _gallery_result_to_universal(platform, url, gallery_result, extract_audio=extract_audio)


async def _resolve_public_metadata(
    *,
    platform: Platform,
    request: DownloadRequest,
    cache_key: str,
) -> tuple[Optional[Dict[str, Any]], Optional[Exception], bool, int, int, bool]:
    url_str = str(request.url)
    if not _is_public_cacheable_request(request):
        resolve_started = time.perf_counter()
        try:
            resolved = await _run_bounded_metadata_resolve(
                platform=platform, request=request, url=url_str
            )
            return resolved, None, False, _elapsed_ms(resolve_started), 0, False
        except asyncio.TimeoutError:
            return None, TimeoutError("provider metadata resolve timed out"), False, _elapsed_ms(resolve_started), 0, False
        except Exception as exc:
            return None, exc, False, _elapsed_ms(resolve_started), 0, False

    cached = _get_resolve_cache(cache_key)
    if cached is not None:
        return cached, None, True, 0, 0, False

    async def resolve_once() -> tuple[Optional[Dict[str, Any]], Optional[Exception], int]:
        resolve_started = time.perf_counter()
        try:
            resolved = await _run_bounded_metadata_resolve(
                platform=platform, request=request, url=url_str
            )
            if resolved and resolved.get('direct_url'):
                _set_resolve_cache(cache_key, resolved)
            return resolved, None, _elapsed_ms(resolve_started)
        except asyncio.TimeoutError as exc:
            return None, TimeoutError("provider metadata resolve timed out"), _elapsed_ms(resolve_started)
        except Exception as exc:
            return None, exc, _elapsed_ms(resolve_started)

    task = _resolve_inflight.get(cache_key)
    single_flight = task is not None
    if task is None:
        print(
            "Info: resolve_cache_miss "
            f"platform={platform.value} cacheKeyHash={_cache_key_hash(cache_key)}"
        )
        task = asyncio.create_task(resolve_once())
        _resolve_inflight[cache_key] = task

    queue_started = time.perf_counter()
    try:
        result, resolve_error, provider_resolve_ms = await asyncio.shield(task)
    finally:
        if task.done() and _resolve_inflight.get(cache_key) is task:
            _resolve_inflight.pop(cache_key, None)

    queue_wait_ms = _elapsed_ms(queue_started) if single_flight else 0
    if result:
        result = copy.deepcopy(result)
        if single_flight:
            result['egress'] = reused_metrics(result.get('egress', {}))
    return result, resolve_error, False, provider_resolve_ms, queue_wait_ms, single_flight


async def download_public(
    platform: Platform, request: DownloadRequest, background_tasks: BackgroundTasks,
    request_id: str | None = None,
) -> DownloadResponse:
    total_started = time.perf_counter()
    url_str = str(request.url)
    cache_key = _resolve_cache_key(platform, request)
    result, resolve_error, cache_hit, provider_resolve_ms, queue_wait_ms, single_flight = await _resolve_public_metadata(
        platform=platform,
        request=request,
        cache_key=cache_key,
    )

    if not result:
        raw_error = str(resolve_error) if resolve_error else "No media resolver returned a result"
        error_code = classify_resolver_error(platform, raw_error)
        error_code = _promote_x_cookie_error(platform, url_str, error_code)
        sanitized_error = sanitize_provider_error(raw_error)
        timing = _timing_payload(
            platform=platform,
            cache_hit=cache_hit,
            single_flight=single_flight,
            queue_wait_ms=queue_wait_ms,
            provider_resolve_ms=provider_resolve_ms,
            normalization_ms=0,
            total_ms=_elapsed_ms(total_started),
            result_count=0,
            error_code=error_code,
            request_id=request_id,
        )
        timing.update(getattr(resolve_error, "egress", ProxyMetrics().report()))
        _log_timing("failed", cache_key=cache_key, timing=timing)
        print(
            "Warning: resolver_failed "
            f"platform={platform.value} error_code={error_code} "
            f"raw_error={sanitized_error[:500]}"
        )
        return DownloadResponse(
            success=False,
            message="Resolve failed",
            status=DownloadStatus.FAILED,
            error=error_code,
            error_code=error_code,
            warnings=[],
        )

    normalization_started = time.perf_counter()
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
                **{key: item.get(key) for key in (
                    "id", "index", "format", "formatId", "quality", "mimeType", "thumbnail",
                    "thumbnailUrl", "hasAudio", "sourceUrl", "variants",
                ) if item.get(key) is not None},
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
        first_image_item = next((item for item in image_items if item.get("type") == "image"), None)
        if first_image_item:
            downloads["image"] = downloads.get("image") or first_image_item["url"]
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
        timing = _timing_payload(
            platform=platform,
            cache_hit=cache_hit,
            single_flight=single_flight,
            queue_wait_ms=queue_wait_ms,
            provider_resolve_ms=provider_resolve_ms,
            normalization_ms=_elapsed_ms(normalization_started),
            total_ms=_elapsed_ms(total_started),
            result_count=0,
            error_code="NO_DIRECT_URL",
            request_id=request_id,
        )
        _log_timing("failed", cache_key=cache_key, timing=timing)
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
    timing = _timing_payload(
        platform=platform,
        cache_hit=cache_hit,
        single_flight=single_flight,
        queue_wait_ms=queue_wait_ms,
        provider_resolve_ms=provider_resolve_ms,
        normalization_ms=_elapsed_ms(normalization_started),
        total_ms=_elapsed_ms(total_started),
        result_count=_result_count({"direct_url": direct_url, "downloads": downloads}),
        request_id=request_id,
    )
    timing.update(result.get("egress", ProxyMetrics().report()))
    downloads["timing"] = timing
    _log_timing("complete", cache_key=cache_key, timing=timing)

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
