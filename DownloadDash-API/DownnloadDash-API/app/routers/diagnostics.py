import asyncio
import importlib.metadata
import os
import socket
from urllib.parse import urlsplit
from typing import Any

import httpx
import yt_dlp
from fastapi import APIRouter, Query

from app.api.cookie_state import inspect_netscape_cookiefile
from app.api.resolver_errors import classify_resolver_error, sanitize_provider_error
from app.models.schemas import Platform, Quality
from app.state import gallery_downloader, public_downloader, universal_downloader
from app.platforms.egress import egress_policy

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


def _direct_url_count(info: Any) -> int:
    count = 0
    if isinstance(info, dict):
        if info.get("url"):
            count += 1
        formats = info.get("formats")
        if isinstance(formats, list):
            count += sum(1 for item in formats if isinstance(item, dict) and item.get("url"))
        entries = info.get("entries")
        if isinstance(entries, list):
            count += sum(_direct_url_count(entry) for entry in entries)
    return count


def _entry_count(info: Any) -> int:
    if isinstance(info, dict) and isinstance(info.get("entries"), list):
        return len(info["entries"])
    return 0


def _formats_count(info: Any) -> int:
    if isinstance(info, dict) and isinstance(info.get("formats"), list):
        return len(info["formats"])
    return 0


def _extractor_name(info: Any) -> str | None:
    if not isinstance(info, dict):
        return None
    return info.get("extractor_key") or info.get("extractor")


async def _probe_ytdlp_trace(url: str, platform: Platform, cookie_state: dict[str, Any]) -> dict[str, Any]:
    cookiefile = public_downloader._cookiefile_for_url(url)
    proxy_url = public_downloader.proxy_urls.get("x") or public_downloader.proxy_urls.get("twitter") or public_downloader.proxy_urls.get("default")
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "ignore_no_formats_error": True,
        "noplaylist": True,
        "socket_timeout": 12,
        "extract_flat": False,
        "http_headers": public_downloader._build_http_headers(url),
    }
    if cookiefile and os.path.exists(cookiefile):
        opts["cookiefile"] = cookiefile
    if proxy_url:
        opts["proxy"] = proxy_url

    trace: dict[str, Any] = {
        "attempted": True,
        "extractor": None,
        "metadataSucceeded": False,
        "entryCount": 0,
        "formatsCount": 0,
        "directMediaUrlCount": 0,
        "cookieFileApplied": bool(opts.get("cookiefile")),
        "nonExpiredCookieRows": int(cookie_state.get("nonExpiredCookieCount") or 0),
        "providerStatusCategory": "UNKNOWN",
    }

    def extract_info() -> Any:
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False)

    try:
        info = await asyncio.get_event_loop().run_in_executor(None, extract_info)
        trace.update(
            {
                "extractor": _extractor_name(info),
                "metadataSucceeded": bool(info),
                "entryCount": _entry_count(info),
                "formatsCount": _formats_count(info),
                "directMediaUrlCount": _direct_url_count(info),
                "providerStatusCategory": "OK",
            }
        )
    except Exception as exc:
        sanitized = sanitize_provider_error(str(exc))
        error_code = _promote_cookie_error(platform, classify_resolver_error(platform, sanitized), cookie_state)
        lower = sanitized.lower()
        if any(
            token in lower
            for token in (
                "401",
                "login",
                "log in",
                "cookie",
                "unauthorized",
                "authorization",
                "sign in",
                "temporarily locked",
                "unlock your account",
            )
        ):
            category = "AUTH"
        elif any(token in lower for token in ("429", "rate limit", "too many requests")):
            category = "RATE_LIMIT"
        elif any(token in lower for token in ("403", "forbidden", "blocked")):
            category = "BLOCKED"
        elif any(token in lower for token in ("timed out", "timeout")):
            category = "TIMEOUT"
        elif any(token in lower for token in ("please report this issue", "unable to extract", "extractor")):
            category = "SCHEMA_OR_EXTRACTOR"
        elif any(token in lower for token in ("not found", "does not exist", "deleted", "removed")):
            category = "NOT_FOUND"
        else:
            category = "FAILED"
        trace.update(
            {
                "errorClass": type(exc).__name__,
                "errorCode": error_code,
                "sanitizedFailure": sanitized[:500],
                "providerStatusCategory": category,
                "classifierRule": error_code,
            }
        )

    return trace


def _promote_cookie_error(platform: Platform, code: str, cookie_state: dict[str, Any]) -> str:
    if platform in (Platform.X, Platform.TWITTER) and code == "COOKIE_REQUIRED" and cookie_state.get("expired") == "YES":
        return "COOKIE_EXPIRED"
    return code


async def _probe_proxy(proxy_url: str | None) -> dict[str, Any]:
    if not proxy_url:
        return {
            "configured": False,
            "dnsReachable": False,
            "tcpReachable": False,
            "reachable": False,
            "authAccepted": None,
            "quotaOrPlan": "NOT_EXPOSED_BY_PROBE",
        }

    try:
        parsed_proxy = urlsplit(proxy_url)
        proxy_host = parsed_proxy.hostname
        proxy_port = parsed_proxy.port or (443 if parsed_proxy.scheme in {"https", "socks5h"} else 1080 if parsed_proxy.scheme.startswith("socks") else 80)
        if not proxy_host:
            raise ValueError("proxy host missing")

        def resolve_and_connect() -> tuple[bool, bool]:
            addresses = socket.getaddrinfo(proxy_host, proxy_port, type=socket.SOCK_STREAM)
            if not addresses:
                return False, False
            try:
                with socket.create_connection((proxy_host, proxy_port), timeout=3.0):
                    return True, True
            except OSError:
                return True, False

        dns_reachable, tcp_reachable = await asyncio.wait_for(asyncio.to_thread(resolve_and_connect), timeout=4.0)
    except Exception as exc:
        return {
            "configured": True,
            "dnsReachable": False,
            "tcpReachable": False,
            "reachable": False,
            "authAccepted": None,
            "quotaOrPlan": "NOT_EXPOSED_BY_PROBE",
            "errorClass": type(exc).__name__,
        }

    try:
        async with httpx.AsyncClient(timeout=8.0, proxy=proxy_url) as client:
            response = await client.get("https://www.google.com/generate_204")
        return {
            "configured": True,
            "dnsReachable": dns_reachable,
            "tcpReachable": tcp_reachable,
            "reachable": response.status_code < 500,
            "authAccepted": response.status_code != 407,
            "status": response.status_code,
            "quotaOrPlan": "NOT_EXPOSED_BY_PROBE",
        }
    except httpx.ProxyError as exc:
        text = sanitize_provider_error(str(exc))
        return {
            "configured": True,
            "dnsReachable": dns_reachable,
            "tcpReachable": tcp_reachable,
            "reachable": False,
            "authAccepted": "407" not in text,
            "errorClass": type(exc).__name__,
            "quotaOrPlan": "NOT_EXPOSED_BY_PROBE",
        }
    except Exception as exc:
        return {
            "configured": True,
            "dnsReachable": dns_reachable,
            "tcpReachable": tcp_reachable,
            "reachable": False,
            "authAccepted": False,
            "errorClass": type(exc).__name__,
            "quotaOrPlan": "NOT_EXPOSED_BY_PROBE",
        }


async def _probe_direct_http() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            response = await client.get("https://www.google.com/generate_204")
        return {"reachable": response.status_code < 500, "status": response.status_code}
    except Exception as exc:
        return {"reachable": False, "errorClass": type(exc).__name__}


@router.get("/provider")
async def provider_diagnostics(
    platform: str = Query(..., pattern="^(instagram|tiktok|pinterest|reddit|youtube|facebook|x|twitter)$"),
    url: str | None = Query(default=None, max_length=2048),
    probe_proxy: bool = Query(default=False),
    run_resolver: bool = Query(default=False),
    run_gallery: bool = Query(default=False),
    probe_media: bool = Query(default=False),
):
    platform_value = _platform_from_value(platform)
    platform_key = "x" if platform_value in (Platform.X, Platform.TWITTER) else platform_value.value
    proxy_url = public_downloader.proxy_urls.get(platform_key) or public_downloader.proxy_urls.get("default")
    gallery_proxy_url = gallery_downloader.proxy_urls.get(platform_key) or gallery_downloader.proxy_urls.get("default")
    probe_url = url or f"https://{platform_key}.com/"
    ytdlp_cookiefile = public_downloader._cookiefile_for_url(probe_url)
    gallery_cookiefile = gallery_downloader.cookiefiles.get(platform_key) or gallery_downloader.cookiefiles.get("default")
    ytdlp_cookie_state = inspect_netscape_cookiefile(ytdlp_cookiefile)
    gallery_cookie_state = inspect_netscape_cookiefile(gallery_cookiefile)

    response: dict[str, Any] = {
        'egressPolicy': {'directFirst': True, 'proxyMediaTransfer': False,
                         'recentHealth': egress_policy.snapshot().get(platform_key, {}),
                         'healthScope': 'current worker'},
        "platform": platform_key,
        "cookiesConfigured": bool(ytdlp_cookie_state["loaded"]),
        "cookieCount": int(ytdlp_cookie_state["cookieCount"]),
        "proxyConfigured": bool(proxy_url),
        "galleryDlCookiesConfigured": bool(gallery_cookie_state["loaded"]),
        "galleryDlProxyConfigured": bool(gallery_proxy_url),
        "cookieState": ytdlp_cookie_state,
        "ytDlpCookie": ytdlp_cookie_state,
        "galleryDlCookie": gallery_cookie_state,
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
        response["directProbe"] = await _probe_direct_http()

    if run_resolver and url:
        try:
            from app.api.shared import _resolve_public_metadata, _resolve_cache_key
            from app.models.schemas import DownloadRequest
            request = DownloadRequest(url=url, platform=platform_value, quality=Quality.HIGH)
            result, failure, *_ = await _resolve_public_metadata(
                platform=platform_value, request=request, cache_key=_resolve_cache_key(platform_value, request))
            if failure:
                raise failure
            response['egress'] = (result or {}).get('egress', {})
            response["resolver"] = {
                "attempted": True,
                "summary": _summarize_universal_result(result),
            }
        except Exception as exc:
            sanitized = sanitize_provider_error(str(exc))
            error_code = classify_resolver_error(platform_value, sanitized)
            response['egress'] = getattr(exc, 'egress', {})
            response["resolver"] = {
                "attempted": True,
                "summary": {"metadataReturned": False, "directUrlReturned": False, "entryCount": 0},
                "errorClass": type(exc).__name__,
                "errorCode": _promote_cookie_error(platform_value, error_code, ytdlp_cookie_state),
                "sanitizedFailure": sanitized[:500],
                "classifierRule": _promote_cookie_error(platform_value, error_code, ytdlp_cookie_state),
            }

    if run_gallery and url:
        try:
            gallery_result = await gallery_downloader.resolve(url, limit=50)
            response["galleryDl"] = {
                "attempted": True,
                "summary": _summarize_gallery_result(gallery_result),
            }
            if not (gallery_result.get("items") if isinstance(gallery_result, dict) else None):
                response["galleryDl"]["zeroEntryFailure"] = "ZERO_ENTRIES"
        except Exception as exc:
            sanitized = sanitize_provider_error(str(exc))
            error_code = classify_resolver_error(platform_value, sanitized)
            response["galleryDl"] = {
                "attempted": True,
                "summary": {"metadataReturned": False, "entryCount": 0},
                "errorClass": type(exc).__name__,
                "errorCode": _promote_cookie_error(platform_value, error_code, gallery_cookie_state),
                "sanitizedFailure": sanitized[:500],
                "classifierRule": _promote_cookie_error(platform_value, error_code, gallery_cookie_state),
            }

    if probe_media and url:
        response['directMediaProbe'] = await _probe_cached_media(url)
    response['egressPolicy']['recentHealth'] = egress_policy.snapshot().get(platform_key, {})

    # Yield once so slow probes do not monopolize the event loop in single-worker runs.
    await asyncio.sleep(0)
    return response


async def _probe_cached_media(source_url):
    """Probe cached CDN formats directly; never re-extract or retry with a proxy."""
    from app.api.download import _validate_media_target
    info = public_downloader.get_resolved_media(source_url)
    if not info:
        return {'phase': 'media_cdn', 'cachedFormats': False, 'proxyTotalBytes': 0, 'samples': []}
    formats = [f for f in info.get('formats', []) if f.get('url') and f.get('protocol') in (None, 'https', 'http')]
    samples = []
    # At most one video and one audio probe; no duplicate HEAD then GET.
    chosen = []
    for kind in ('video', 'audio'):
        candidate = next((f for f in formats if (f.get('vcodec') == 'none') == (kind == 'audio')), None)
        if candidate and candidate['url'] not in {f['url'] for f in chosen}:
            chosen.append(candidate)
    async with httpx.AsyncClient(timeout=5, trust_env=False, follow_redirects=False) as client:
        for fmt in chosen:
            target = fmt['url']
            try:
                _validate_media_target(target)
                headers = public_downloader._build_http_headers(source_url)
                headers['Range'] = 'bytes=0-1023'
                async with client.stream('GET', target, headers=headers) as res:
                    count = 0
                    async for chunk in res.aiter_raw(chunk_size=1024):
                        count += len(chunk)
                        break  # Close even if the provider ignores Range.
                    samples.append({'host': urlsplit(target).hostname, 'status': res.status_code,
                                    'contentType': res.headers.get('content-type'), 'sampleBytes': count,
                                    'rangeHonored': res.status_code == 206})
            except Exception as exc:
                samples.append({'phase': 'media_cdn', 'errorClass': type(exc).__name__})
    return {'phase': 'media_cdn', 'cachedFormats': True, 'proxyTotalBytes': 0, 'samples': samples}
