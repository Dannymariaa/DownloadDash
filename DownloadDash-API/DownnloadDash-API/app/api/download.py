from fastapi import APIRouter, BackgroundTasks, HTTPException, Body, Query
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
import httpx
import os
import re
import time
from urllib.parse import urlparse

from app.api.shared import detect_platform, download_public
from app.config import settings
from app.models.schemas import DownloadRequest, DownloadResponse, DownloadStatus, Platform
from app.state import public_downloader, whatsapp_downloader

router = APIRouter(tags=["download"])


@router.post("/download", response_model=DownloadResponse)
async def download_media(
    request: DownloadRequest,
    background_tasks: BackgroundTasks,
):
    url_str = str(request.url)
    platform = request.platform or detect_platform(url_str)

    if not platform:
        raise HTTPException(status_code=400, detail="Could not detect platform")

    if platform in public_downloader.get_supported_platforms() or platform in (
        Platform.TWITTER,
        Platform.X,
    ):
        normalized = Platform.TWITTER if platform == Platform.X else platform
        return await download_public(normalized, request, background_tasks)

    if platform in (Platform.WHATSAPP, Platform.WHATSAPP_BUSINESS):
        status = await whatsapp_downloader.get_connection_status()
        return DownloadResponse(
            success=False,
            message="WhatsApp download not implemented in API yet",
            status=DownloadStatus.FAILED,
            error=status.get("error") or "Use /whatsapp/status and /whatsapp/qr first",
            warnings=[],
        )

    if platform == Platform.TELEGRAM:
        return DownloadResponse(
            success=False,
            message="Telegram download not configured",
            status=DownloadStatus.FAILED,
            error="Set TELEGRAM_BOT_TOKEN (or implement Telethon support)",
            warnings=[],
        )

    raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")


def _safe_filename(name: str) -> str:
    value = re.sub(r'[\\/:*?"<>|]+', '_', name or 'download').strip()
    return value[:160] if value else 'download'


def _httpx_client_kwargs(**kwargs):
    # Final media bytes must not travel through residential proxies. This helper is
    # intentionally direct-only; proxy use is limited to metadata/signature resolve.
    return kwargs


def _should_redirect_direct(url: str, media_type: str | None = None) -> bool:
    media_key = (media_type or "").lower()
    if media_key in {"hd", "sd", "video", "audio", "image", "photo", "album"}:
        return True
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    path = parsed.path.lower()
    if any(token in host for token in ("googlevideo.com", "ytimg.com", "fbcdn.net", "cdninstagram.com", "tiktokcdn", "twimg.com", "pinimg.com")):
        return True
    return path.endswith((".mp4", ".m4a", ".mp3", ".webm", ".mov", ".jpg", ".jpeg", ".png", ".webp", ".gif"))


def _download_headers(url: str, source_url: str | None = None, retry: bool = False) -> dict:
    source = source_url if isinstance(source_url, str) else ""
    is_tiktok = "tiktok" in f"{url} {source}".lower() or "muscdn" in url.lower()
    user_agent = (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
        if retry and is_tiktok
        else "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    )
    headers = {
        "User-Agent": user_agent,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
    }

    if source.startswith(("http://", "https://")):
        parsed_source = urlparse(source)
        headers["Referer"] = source
        if parsed_source.scheme and parsed_source.netloc:
            headers["Origin"] = f"{parsed_source.scheme}://{parsed_source.netloc}"
    elif is_tiktok:
        headers["Referer"] = "https://www.tiktok.com/"
        headers["Origin"] = "https://www.tiktok.com"

    if is_tiktok:
        headers["Sec-Fetch-Dest"] = "video"
        headers["Sec-Fetch-Mode"] = "no-cors"
        headers["Sec-Fetch-Site"] = "cross-site"
        headers["Range"] = "bytes=0-" if retry else "bytes=0-"

    return headers


def _tiktok_variant_for_media_type(media_type: str | None) -> str:
    media_type_key = str(media_type or "").lower()
    if "audio" in media_type_key:
        return "audio"
    if "image" in media_type_key or "photo" in media_type_key or "album" in media_type_key:
        return "image"
    if "sd" in media_type_key:
        return "sd"
    return "hd"


async def _serve_download_file(
    background_tasks: BackgroundTasks,
    url: str | None,
    filename: str | None,
    source_url: str | None,
    media_type: str | None,
):
    source_url = source_url if isinstance(source_url, str) else ""
    url = url if isinstance(url, str) else ""

    if not url and "tiktok.com" in source_url.lower():
        variant = _tiktok_variant_for_media_type(media_type)
        try:
            fallback = await public_downloader.download_tiktok_variant(source_url, variant)
        except Exception as exc:
            raw_error = re.sub(r"\s+", " ", str(exc)).strip()
            raise HTTPException(
                status_code=502,
                detail=(
                    "TikTok server-side download failed. The original signed CDN URL was not reused; "
                    "the API tried to fetch a fresh file from the source URL instead. "
                    "If this persists, refresh SMD_YTDLP_COOKIE_DATA_TIKTOK or configure SMD_YTDLP_PROXY_TIKTOK on Render. "
                    f"Fallback error: {raw_error}"
                ),
            )

        path = fallback["path"]
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Downloaded TikTok file not found")

        safe_name = _safe_filename(filename or fallback["filename"])
        background_tasks.add_task(os.remove, path)
        return FileResponse(
            path,
            media_type=fallback["media_type"],
            filename=safe_name or fallback["filename"],
            background=background_tasks,
        )

    if not url:
        raise HTTPException(status_code=400, detail="url or sourceUrl is required")
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="url must be http(s)")

    safe_name = _safe_filename(filename or "download")
    if _should_redirect_direct(url, media_type):
        print(
            "Info: direct_media_redirect "
            f"filename={safe_name} media_type={media_type or ''} proxy_used=false url_host={urlparse(url).netloc}"
        )
        return RedirectResponse(url=url, status_code=302)

    started = time.monotonic()
    client = httpx.AsyncClient(
        **_httpx_client_kwargs(timeout=httpx.Timeout(60.0, connect=10.0), follow_redirects=True)
    )
    try:
        upstream = await client.send(
            client.build_request("GET", url, headers=_download_headers(url, source_url)),
            stream=True,
        )
        if upstream.status_code in (403, 429):
            await upstream.aclose()
            upstream = await client.send(
                client.build_request("GET", url, headers=_download_headers(url, source_url, retry=True)),
                stream=True,
            )
    except Exception as e:
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Upstream download failed: {e}")

    if upstream.status_code >= 400:
        body_preview = ""
        try:
            body_preview = (await upstream.aread()).decode("utf-8", errors="replace")[:300]
        finally:
            await upstream.aclose()
            await client.aclose()

        blocked_by_varnish = "varnish" in body_preview.lower() or "54113" in body_preview
        is_tiktok_source = "tiktok.com" in f"{source_url or ''}".lower()
        if is_tiktok_source:
            variant = _tiktok_variant_for_media_type(media_type)
            try:
                fallback = await public_downloader.download_tiktok_variant(source_url, variant)
            except Exception as exc:
                raw_error = re.sub(r"\s+", " ", str(exc)).strip()
                detail = (
                    "TikTok blocked both the signed media URL and the server fallback. "
                    "Set fresh SMD_YTDLP_COOKIEFILE_TIKTOK cookies and, if needed, SMD_YTDLP_PROXY_TIKTOK on Render, then redeploy. "
                    f"Fallback error: {raw_error}"
                )
                raise HTTPException(status_code=502, detail=detail)

            path = fallback["path"]
            if not os.path.exists(path):
                raise HTTPException(status_code=404, detail="Downloaded TikTok file not found")

            background_tasks.add_task(os.remove, path)
            return FileResponse(
                path,
                media_type=fallback["media_type"],
                filename=safe_name or fallback["filename"],
                background=background_tasks,
            )

        detail = (
            "TikTok blocked the media request upstream (Varnish/Error 54113). "
            "Please try again later or configure a TikTok/residential proxy for the API."
            if blocked_by_varnish
            else f"Upstream download failed ({upstream.status_code})"
        )
        raise HTTPException(status_code=502, detail=detail)

    content_type = upstream.headers.get("content-type") or "application/octet-stream"
    content_length = upstream.headers.get("content-length")

    async def iter_direct_media():
        bytes_sent = 0
        try:
            async for chunk in upstream.aiter_bytes(chunk_size=1024 * 256):
                if not chunk:
                    continue
                bytes_sent += len(chunk)
                yield chunk
        finally:
            elapsed_ms = (time.monotonic() - started) * 1000
            print(
                "Info: direct_media_stream_complete "
                f"filename={safe_name} bytes={bytes_sent} time_ms={elapsed_ms:.2f} proxy_used=false"
            )
            await upstream.aclose()
            await client.aclose()

    response = StreamingResponse(iter_direct_media(), media_type=content_type)
    response.headers["Content-Disposition"] = f'attachment; filename="{safe_name}"'
    response.headers["X-Proxy-Used"] = "false"
    if content_length:
        response.headers["Content-Length"] = content_length
    return response


@router.post("/download/file")
async def download_file_proxy(
    background_tasks: BackgroundTasks,
    payload: dict = Body(...),
):
    return await _serve_download_file(
        background_tasks=background_tasks,
        url=payload.get("url"),
        filename=payload.get("filename") or "download",
        source_url=payload.get("sourceUrl") or payload.get("source_url") or payload.get("referrer"),
        media_type=payload.get("mediaType") or payload.get("media_type") or "",
    )


@router.get("/download/file")
async def download_file_proxy_get(
    background_tasks: BackgroundTasks,
    url: str | None = Query(default=None),
    filename: str | None = Query(default="download"),
    sourceUrl: str | None = Query(default=None),
    source_url: str | None = Query(default=None),
    mediaType: str | None = Query(default=""),
    media_type: str | None = Query(default=""),
):
    return await _serve_download_file(
        background_tasks=background_tasks,
        url=url,
        filename=filename,
        source_url=sourceUrl or source_url,
        media_type=mediaType or media_type or "",
    )
