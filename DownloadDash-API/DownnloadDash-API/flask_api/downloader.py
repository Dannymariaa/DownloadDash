import json
import re
from threading import Lock
from typing import Optional

from flask_api.cache import get_cache, make_cache_key, set_cache
from flask_api.proxy import get_proxy_session, PROXY
from flask_api.utils.logger import log_bandwidth, logger

try:
    from yt_dlp import YoutubeDL
    YTDLP_AVAILABLE = True
except ImportError:
    YTDLP_AVAILABLE = False

_platform_locks = {}
_platform_locks_global = Lock()

SUPPORTED_PLATFORMS = {
    "youtube": "extract_youtube",
    "tiktok": "extract_tiktok",
    "instagram": "extract_instagram",
    "facebook": "extract_facebook",
    "x": "extract_x",
    "twitter": "extract_x",
    "reddit": "extract_reddit",
    "pinterest": "extract_pinterest",
}


def _acquire_lock(key: str):
    with _platform_locks_global:
        if key not in _platform_locks:
            _platform_locks[key] = Lock()
        return _platform_locks[key]


def _fetch_html(url: str) -> str:
    session = get_proxy_session()
    response = session.get(
        url,
        timeout=15,
        headers={
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
        allow_redirects=True,
    )
    log_bandwidth("html", response.headers.get("Content-Length"), url)
    response.raise_for_status()
    return response.text


def _extract_meta_video(html: str) -> Optional[str]:
    patterns = [
        r'<meta[^>]+property="og:video:secure_url"[^>]+content="([^"]+)"',
        r'<meta[^>]+property="og:video:url"[^>]+content="([^"]+)"',
        r'<meta[^>]+name="og:video"[^>]+content="([^"]+)"',
        r'<meta[^>]+property="og:audio"[^>]+content="([^"]+)"',
        r'<meta[^>]+property="og:url"[^>]+content="([^"]+)"',
    ]

    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return None


def _choose_best_format(formats: list) -> Optional[str]:
    if not formats:
        return None

    valid_formats = [f for f in formats if f.get("url")]
    if not valid_formats:
        return None

    valid_formats.sort(key=lambda f: ((f.get("height") or 0), (f.get("tbr") or 0)), reverse=True)
    return valid_formats[0].get("url")


def extract_with_yt_dlp(url: str) -> str:
    if not YTDLP_AVAILABLE:
        raise RuntimeError("yt-dlp is required for this extractor.")

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noprogress": True,
        "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    }

    if PROXY:
        ydl_opts["proxy"] = PROXY

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise ValueError("Could not extract metadata from the provided URL.")

    if info.get("url") and isinstance(info.get("url"), str):
        return info["url"]

    if info.get("formats"):
        best_url = _choose_best_format(info["formats"])
        if best_url:
            return best_url

    if info.get("entries"):
        entry = info["entries"][0] if info["entries"] else None
        if entry and entry.get("formats"):
            best_url = _choose_best_format(entry["formats"])
            if best_url:
                return best_url

    raise ValueError("Unable to resolve a direct media URL from the source metadata.")


def extract_youtube(url: str) -> str:
    return extract_with_yt_dlp(url)


def extract_tiktok(url: str) -> str:
    return extract_with_yt_dlp(url)


def extract_instagram(url: str) -> str:
    try:
        return extract_with_yt_dlp(url)
    except Exception:
        html = _fetch_html(url)
        media = _extract_meta_video(html)
        if media:
            return media
        raise ValueError("Could not extract a direct Instagram media URL.")


def extract_facebook(url: str) -> str:
    try:
        return extract_with_yt_dlp(url)
    except Exception:
        html = _fetch_html(url)
        media = _extract_meta_video(html)
        if media:
            return media
        raise ValueError("Could not extract a direct Facebook media URL.")


def extract_x(url: str) -> str:
    try:
        return extract_with_yt_dlp(url)
    except Exception:
        html = _fetch_html(url)
        media = _extract_meta_video(html)
        if media:
            return media
        raise ValueError("Could not extract a direct X media URL.")


def extract_reddit(url: str) -> str:
    json_url = url.rstrip("/") + ".json"
    session = get_proxy_session()
    response = session.get(
        json_url,
        timeout=15,
        headers={
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        },
        allow_redirects=True,
    )
    log_bandwidth("reddit", response.headers.get("Content-Length"), json_url)
    response.raise_for_status()

    try:
        data = response.json()
    except ValueError:
        raise ValueError("Invalid Reddit response format.")

    post = None
    if isinstance(data, list) and data:
        post = data[0].get("data", {}).get("children", [])[0].get("data")
    elif isinstance(data, dict):
        post = data.get("data", {}).get("children", [])[0].get("data")

    if not post:
        raise ValueError("Reddit post data could not be parsed.")

    secure_media = post.get("secure_media") or {}
    reddit_video = secure_media.get("reddit_video")
    if reddit_video and reddit_video.get("fallback_url"):
        return reddit_video["fallback_url"]

    if post.get("url_overridden_by_dest"):
        return post["url_overridden_by_dest"]

    raise ValueError("Could not extract a direct Reddit media URL.")


def extract_pinterest(url: str) -> str:
    try:
        return extract_with_yt_dlp(url)
    except Exception:
        html = _fetch_html(url)
        media = _extract_meta_video(html)
        if media:
            return media
        raise ValueError("Could not extract a direct Pinterest media URL.")


def download_media(url: str, platform: str):
    platform = platform.lower().strip()
    if platform not in SUPPORTED_PLATFORMS:
        raise ValueError(
            "Platform not supported. Supported platforms: youtube, tiktok, instagram, facebook, x, twitter, reddit, pinterest."
        )

    cache_key = make_cache_key(f"{platform}:{url}")
    cached = get_cache(cache_key)
    if cached and isinstance(cached, dict) and cached.get("media"):
        return {"success": True, "media": cached["media"], "cached": True}

    lock = _acquire_lock(cache_key)
    with lock:
        cached = get_cache(cache_key)
        if cached and isinstance(cached, dict) and cached.get("media"):
            return {"success": True, "media": cached["media"], "cached": True}

        extractor_name = SUPPORTED_PLATFORMS[platform]
        extractor = globals()[extractor_name]
        media_url = extractor(url)

        if not media_url:
            raise ValueError("Extraction succeeded but no direct media URL was found.")

        set_cache(cache_key, {"media": media_url}, ttl=86400)
        return {"success": True, "media": media_url, "cached": False}
