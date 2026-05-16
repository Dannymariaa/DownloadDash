import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.models.platform_requests import YouTubeDownloadIn
from app.models.schemas import DownloadResponse, DownloadStatus, MediaInfo, MediaType, Platform
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


