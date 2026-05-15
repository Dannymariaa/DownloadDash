import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import StreamingResponse
import httpx

from app.models.platform_requests import YouTubeDownloadIn
from app.models.schemas import DownloadResponse, DownloadStatus, MediaInfo, MediaType, Platform
from app.state import public_downloader

router = APIRouter(prefix="/youtube", tags=["youtube"])


async def _stream_youtube_cover(url: str, background_tasks: BackgroundTasks):
    cover_url = public_downloader._youtube_cover_url(url)  # type: ignore[attr-defined]
    if not cover_url:
        raise HTTPException(status_code=502, detail="YouTube cover download failed. Please try again.")

    fallback_cover_url = None
    if "maxresdefault" in cover_url:
        fallback_cover_url = cover_url.replace("maxresdefault", "hqdefault")

    headers = {
        "User-Agent": public_downloader.user_agent,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, headers=headers) as client:
        upstream = await client.get(cover_url)
        if upstream.status_code >= 400 and fallback_cover_url:
            upstream = await client.get(fallback_cover_url)

    if upstream.status_code >= 400:
        raise HTTPException(status_code=502, detail="YouTube cover download failed. Please try again.")

    content_type = upstream.headers.get("content-type") or "image/jpeg"
    extension = "webp" if "webp" in content_type else "jpg"
    return StreamingResponse(
        iter([upstream.content]),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="youtube-cover.{extension}"'},
        background=background_tasks,
    )


@router.post("/download", response_model=DownloadResponse)
async def download_youtube(body: YouTubeDownloadIn, background_tasks: BackgroundTasks):
    url = str(body.url)
    download_id = str(uuid.uuid4())
    cover_url = public_downloader._youtube_cover_url(url)  # type: ignore[attr-defined]

    if not cover_url:
        raise HTTPException(status_code=400, detail="Could not find a YouTube cover for this URL")

    media_info = MediaInfo(
        id=download_id,
        platform=Platform.YOUTUBE,
        media_type=MediaType.IMAGE,
        url=url,
        title="YouTube Cover",
        thumbnail_url=cover_url,
        download_url=cover_url,
        file_format="jpg",
    )

    return DownloadResponse(
        success=True,
        message="Resolved YouTube cover successfully",
        download_id=download_id,
        status=DownloadStatus.COMPLETED,
        media_info=media_info,
        download_url=cover_url,
        downloads={"image": cover_url},
        expires_at=datetime.utcnow() + timedelta(hours=1),
        warnings=[
            "YouTube video downloads are temporarily disabled while the proxy is unavailable. Returning the video cover instead."
        ],
    )


@router.get("/file")
async def download_youtube_file(
    background_tasks: BackgroundTasks,
    url: str = Query(...),
    variant: str = Query("hd", pattern="^(hd|sd|audio)$"),
):
    return await _stream_youtube_cover(url, background_tasks)
