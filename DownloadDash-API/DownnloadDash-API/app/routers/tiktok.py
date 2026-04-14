from fastapi import APIRouter, BackgroundTasks

from app.api.shared import download_public
from app.models.platform_requests import TikTokDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform

router = APIRouter(prefix="/tiktok", tags=["tiktok"])


@router.post("/download", response_model=DownloadResponse)
async def download_tiktok(body: TikTokDownloadIn, background_tasks: BackgroundTasks):
    req = DownloadRequest(
        url=body.url,
        platform=Platform.TIKTOK,
        quality=body.quality,
        extract_audio=body.extract_audio,
        include_metadata=body.include_metadata,
    )
    return await download_public(Platform.TIKTOK, req, background_tasks)
