from fastapi import APIRouter, BackgroundTasks

from app.api.shared import download_public
from app.models.platform_requests import InstagramDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform

router = APIRouter(prefix="/instagram", tags=["instagram"])


@router.post("/download", response_model=DownloadResponse)
async def download_instagram(body: InstagramDownloadIn, background_tasks: BackgroundTasks):
    """Download Instagram media with yt-dlp/instaloader first, then gallery-dl fallback."""
    req = DownloadRequest(
        url=body.url,
        platform=Platform.INSTAGRAM,
        quality=body.quality,
        extract_audio=body.extract_audio,
        include_metadata=body.include_metadata,
    )
    return await download_public(Platform.INSTAGRAM, req, background_tasks)
