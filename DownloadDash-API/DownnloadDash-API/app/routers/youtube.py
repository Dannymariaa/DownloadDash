import os
import re
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse, RedirectResponse

from app.models.platform_requests import YouTubeDownloadIn
from app.models.schemas import DownloadResponse, DownloadStatus, MediaInfo, MediaType, Platform, Quality
from app.state import public_downloader, universal_downloader

router = APIRouter(prefix="/youtube", tags=["youtube"])




def _kind_to_media_type(kind: str) -> MediaType:
    if kind == "audio":
        return MediaType.AUDIO
    if kind == "image":
        return MediaType.IMAGE
    if kind == "album":
        return MediaType.ALBUM
    return MediaType.VIDEO


@router.post("/download", response_model=DownloadResponse)
async def download_youtube(body: YouTubeDownloadIn, background_tasks: BackgroundTasks):
    url = str(body.url)
    download_id = str(uuid.uuid4())

    try:
        result = await universal_downloader.resolve_media(
            url=url,
            platform=Platform.YOUTUBE,
            quality=body.quality,
            extract_audio=body.extract_audio,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if not result or not result.get("direct_url"):
        raise HTTPException(status_code=502, detail="YouTube media resolve failed")

    kind = result.get("kind") or "video"
    media_type = _kind_to_media_type(kind)
    direct_url = result.get("direct_url")
    thumbnail = result.get("thumbnail")
    title = result.get("title") or "YouTube Media"
    downloads = result.get("downloads") or {}

    if media_type == MediaType.VIDEO and not downloads.get("videoHD"):
        downloads["videoHD"] = direct_url
    if media_type == MediaType.AUDIO and not downloads.get("audio"):
        downloads["audio"] = direct_url
    if media_type == MediaType.IMAGE and not downloads.get("image"):
        downloads["image"] = direct_url
    if media_type == MediaType.VIDEO and not downloads.get("videoSD"):
        downloads["videoSD"] = downloads.get("videoHD")

    return DownloadResponse(
        success=True,
        message="Resolved YouTube media successfully",
        download_id=download_id,
        status=DownloadStatus.COMPLETED,
        media_info=MediaInfo(
            id=download_id,
            platform=Platform.YOUTUBE,
            media_type=media_type,
            url=url,
            title=title,
            thumbnail_url=thumbnail,
            download_url=direct_url,
            file_format=result.get("ext") or ("mp3" if body.extract_audio else "mp4" if media_type == MediaType.VIDEO else "jpg"),
        ),
        download_url=direct_url,
        downloads=downloads,
        expires_at=datetime.utcnow() + timedelta(hours=1),
        warnings=[],
    )


@router.get("/file")
async def download_youtube_file(
    background_tasks: BackgroundTasks,
    url: str = Query(...),
    variant: str = Query("hd", pattern="^(hd|sd|audio)$"),
):
    extract_audio = variant == "audio"
    try:
        resolved = await public_downloader.resolve_media(
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
    except Exception:
        pass

    try:
        result = await public_downloader.download_youtube_variant(url, variant)
    except Exception as exc:
        raw_error = str(exc)
        lowered = raw_error.lower()

        if "sign in to confirm" in lowered or "not a bot" in lowered or "captcha" in lowered:
            message = (
                "YouTube is blocking this server for the final file download. "
                "Check the YouTube cookies and residential proxy settings, then redeploy the API."
            )
        elif "requested format is not available" in lowered:
            message = "That YouTube quality is not available for this video. Try SD or audio."
        elif "tunnel connection failed" in lowered or "proxy" in lowered:
            message = (
                "The configured YouTube proxy could not complete the download. "
                "Check SMD_YTDLP_PROXY_YOUTUBE on Render and redeploy the API."
            )
        elif "ffmpeg" in lowered:
            message = (
                "The server could not finish the YouTube file conversion step. "
                "Install ffmpeg on the API server or use a direct progressive format fallback."
            )
        else:
            message = f"YouTube file download failed: {raw_error}"

        safe_detail = re.sub(r"\s+", " ", message).strip()
        raise HTTPException(status_code=502, detail=safe_detail)

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


