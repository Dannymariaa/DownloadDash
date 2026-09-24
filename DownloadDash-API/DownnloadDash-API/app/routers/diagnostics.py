import asyncio
import importlib.metadata
from typing import Any

import httpx
from fastapi import APIRouter, Query

from app.api.resolver_errors import classify_resolver_error, sanitize_provider_error
from app.models.schemas import Platform, Quality
from app.state import gallery_downloader, public_downloader, universal_downloader

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


def _package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def _platform_from_value(value: str) -> Platform:
    normalized = value.lower().strip()
    if normalized == "twitter":
        normalized = "x"
    return Platform(normalized)


def _summarize_items(items: Any) -> dict[str, Any]:
    if not isinstance(items, list):
        return {"count": 0, "types": []}
    types: list[str] = []
    for item in items:
        if isinstance(item, dict):
            item_type = str(item.get("type") or item.get("kind") or item.get("media_type") or "unknown")
        else:
            item_type = "unknown"
        types.append(item_type)
    return {"count": len(items), "types": types}


def _summarize_universal_result(result: Any) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {"metadataReturned": False, "directUrlReturned": False, "entryCount": 0, "types": []}

    downloads = result.get("downloads") or {}
    item_summary = _summarize_items(downloads.get("items") or result.get("items"))
    return {
        "metadataReturned": True,
        "directUrlReturned": bool(result.get("direct_url")),
        "videoUrlReturned": bool(downloads.get("videoHD") or downloads.get("videoSD") or downloads.get("video")),
        "imageUrlReturned": bool(downloads.get("image")),
        "audioUrlReturned": bool(downloads.get("audio")),
        "entryCount": item_summary["count"],
        "types": item_summary["types"],
        "kind": result.get("kind"),
        "source": result.get("source") or "universal",
    }


def _summarize_gallery_result(result: Any) -> dict[str, Any]:
    if not isinstance(result, dict):
        return {"metadataReturned": False, "entryCount": 0, "types": []}
    item_summary = _summarize_items(result.get("items"))
    return {
        "metadataReturned": True,
        "entryCount": item_summary["count"],
        "types": item_summary["types"],
        "source": "gallery-dl",
    }


async def _probe_proxy(proxy_url: str | None) -> dict[str, Any]:
    if not proxy_url:
        return {"configured": False, "reachable": False, "authAccepted": False}

    try:
        async with httpx.AsyncClient(timeout=12.0, proxy=proxy_url) as client:
            response = await client.get("https://www.google.com/generate_204")
        return {
            "configured": True,
            "reachable": response.status_code < 500,
            "authAccepted": response.status_code != 407,
            "status": response.status_code,
        }
    except httpx.ProxyError as exc:
        text = sanitize_provider_error(str(exc))
        return {
            "configured": True,
            "reachable": False,
            "authAccepted": "407" not in text,
            "errorClass": type(exc).__name__,
        }
    except Exception as exc:
        return {
            "configured": True,
            "reachable": False,
            "authAccepted": False,
            "errorClass": type(exc).__name__,
        }


@router.get("/provider")
async def provider_diagnostics(
    platform: str = Query(..., pattern="^(instagram|tiktok|pinterest|reddit|youtube|facebook|x|twitter)$"),
    url: str | None = Query(default=None, max_length=2048),
    probe_proxy: bool = Query(default=False),
    run_resolver: bool = Query(default=False),
    run_gallery: bool = Query(default=False),
):
    platform_value = _platform_from_value(platform)
    platform_key = "x" if platform_value in (Platform.X, Platform.TWITTER) else platform_value.value
    proxy_url = public_downloader.proxy_urls.get(platform_key) or public_downloader.proxy_urls.get("default")
    gallery_proxy_url = gallery_downloader.proxy_urls.get(platform_key) or gallery_downloader.proxy_urls.get("default")
    cookie_names = public_downloader._cookie_names_for_url(url or f"https://{platform_key}.com/")
    gallery_cookiefile = gallery_downloader.cookiefiles.get(platform_key) or gallery_downloader.cookiefiles.get("default")

    response: dict[str, Any] = {
        "platform": platform_key,
        "cookiesConfigured": bool(cookie_names),
        "cookieCount": len(cookie_names),
        "proxyConfigured": bool(proxy_url),
        "galleryDlCookiesConfigured": bool(gallery_cookiefile),
        "galleryDlProxyConfigured": bool(gallery_proxy_url),
        "directConnectionSucceeds": "NOT_SAFE_TO_TEST",
        "extractors": {
            "yt-dlp": _package_version("yt-dlp"),
            "gallery-dl": _package_version("gallery-dl"),
            "instaloader": _package_version("instaloader"),
            "instagrapi": _package_version("instagrapi"),
            "social-media-downloader": _package_version("social-media-downloader"),
            "tiktok-content-scraper": _package_version("tiktok-content-scraper"),
        },
    }

    if probe_proxy:
        response["proxyProbe"] = await _probe_proxy(proxy_url)
        response["galleryDlProxyProbe"] = await _probe_proxy(gallery_proxy_url)

    if run_resolver and url:
        try:
            result = await universal_downloader.resolve_media(
                url=url,
                platform=platform_value,
                quality=Quality.HIGHEST,
            )
            response["resolver"] = {
                "attempted": True,
                "summary": _summarize_universal_result(result),
            }
        except Exception as exc:
            sanitized = sanitize_provider_error(str(exc))
            response["resolver"] = {
                "attempted": True,
                "summary": {"metadataReturned": False, "directUrlReturned": False, "entryCount": 0},
                "errorClass": type(exc).__name__,
                "errorCode": classify_resolver_error(platform_value, sanitized),
            }

    if run_gallery and url:
        try:
            gallery_result = await gallery_downloader.resolve(url, limit=50)
            response["galleryDl"] = {
                "attempted": True,
                "summary": _summarize_gallery_result(gallery_result),
            }
        except Exception as exc:
            sanitized = sanitize_provider_error(str(exc))
            response["galleryDl"] = {
                "attempted": True,
                "summary": {"metadataReturned": False, "entryCount": 0},
                "errorClass": type(exc).__name__,
                "errorCode": classify_resolver_error(platform_value, sanitized),
            }

    # Yield once so slow probes do not monopolize the event loop in single-worker runs.
    await asyncio.sleep(0)
    return response
