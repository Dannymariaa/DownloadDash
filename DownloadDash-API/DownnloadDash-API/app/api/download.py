from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
import httpx
import re

from app.api.shared import detect_platform, download_public
from app.api.security import require_api_key
from app.models.schemas import DownloadRequest, DownloadResponse, DownloadStatus, Platform
from app.state import public_downloader, whatsapp_downloader

router = APIRouter(tags=["download"])


@router.post("/download", response_model=DownloadResponse)
async def download_media(
    request: DownloadRequest,
    background_tasks: BackgroundTasks,
    _auth: None = Depends(require_api_key),
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


@router.post("/download/file")
async def download_file_proxy(
    payload: dict = Body(...),
    _auth: None = Depends(require_api_key),
):
    url = payload.get("url")
    filename = payload.get("filename") or "download"

    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="url is required")
    if not url.startswith("http://") and not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="url must be http(s)")

    safe_name = _safe_filename(filename)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
    }

    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            upstream = await client.get(url, headers=headers)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Upstream download failed: {e}")

        if upstream.status_code >= 400:
            raise HTTPException(status_code=upstream.status_code, detail="Upstream download failed")

        content_type = upstream.headers.get("content-type") or "application/octet-stream"
        content_length = upstream.headers.get("content-length")

        response = StreamingResponse(upstream.aiter_bytes(), media_type=content_type)
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_name}"'
        if content_length:
            response.headers["Content-Length"] = content_length
        return response
