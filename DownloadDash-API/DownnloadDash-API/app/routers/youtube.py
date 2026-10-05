import os

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse

from app.models.platform_requests import YouTubeDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform, Quality
from app.state import public_downloader
from app.api.shared import download_public
from app.api.resolver_errors import TERMINAL_PROVIDER_ERRORS, classify_resolver_error

router = APIRouter(prefix="/youtube", tags=["youtube"])


def _file_failure(error: Exception):
    code = classify_resolver_error(Platform.YOUTUBE, str(error))
    responses = {
        'ANTI_BOT_CHALLENGE': (403, 'The platform blocked access with a security challenge.'),
        'COOKIE_REQUIRED': (401, 'This media requires an authenticated platform session.'),
        'COOKIE_EXPIRED': (401, 'This media requires a refreshed platform session.'),
        'LOGIN_REQUIRED': (401, 'This media requires an authenticated platform session.'),
        'PRIVATE_MEDIA': (403, 'This media is private or restricted.'),
        'MEDIA_NOT_FOUND': (404, 'This media is no longer available.'),
        'PROVIDER_TIMEOUT': (504, 'The media provider timed out. Please try again.'),
        'RATE_LIMITED': (429, 'Too many requests. Please try again later.'),
    }
    status, message = responses.get(code, (502, 'Media delivery failed. Please try again.'))
    if code == 'EXTRACTOR_FAILED':
        code = 'MEDIA_DELIVERY_FAILED'
    return JSONResponse(status_code=status, content={'success': False, 'error': {'code': code, 'message': message}})


@router.post("/download", response_model=DownloadResponse)
async def download_youtube(body: YouTubeDownloadIn, background_tasks: BackgroundTasks):
    request = DownloadRequest(
        url=body.url, platform=Platform.YOUTUBE, quality=body.quality,
        extract_audio=body.extract_audio, include_metadata=body.include_metadata,
    )
    return await download_public(Platform.YOUTUBE, request, background_tasks)


@router.get("/file")
async def download_youtube_file(
    background_tasks: BackgroundTasks,
    url: str = Query(...),
    variant: str = Query("hd", pattern="^(hd|sd|audio)$"),
):
    try:
        url = str(YouTubeDownloadIn(url=url).url)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid YouTube file source") from None
    extract_audio = variant == "audio"
    try:
        resolved = {} if public_downloader.get_resolved_media(url) else await public_downloader.resolve_media(
            url,
            Quality.HIGH,
            extract_audio=extract_audio,
        )
        downloads = resolved.get("downloads") or {}
        direct_url = (
            downloads.get("audio")
            if extract_audio
            else downloads.get("videoSD") if variant == "sd" else downloads.get("videoHD")
        ) or resolved.get("direct_url")
        if isinstance(direct_url, str) and direct_url.startswith(("http://", "https://")):
            print(
                "Info: youtube_file_direct_redirect "
                f"variant={variant} proxy_used=false host={direct_url.split('/')[2] if '://' in direct_url else ''}"
            )
            return RedirectResponse(url=direct_url, status_code=302)
    except Exception as exc:
        if classify_resolver_error(Platform.YOUTUBE, str(exc)) in TERMINAL_PROVIDER_ERRORS:
            return _file_failure(exc)

    try:
        result = await public_downloader.download_youtube_variant(url, variant)
    except Exception as exc:
        return _file_failure(exc)

    path = result["path"]
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Downloaded file not found")

    background_tasks.add_task(os.remove, path)
    return FileResponse(
        path,
        media_type=result["media_type"],
        filename=result["filename"],
        background=background_tasks,
    )


