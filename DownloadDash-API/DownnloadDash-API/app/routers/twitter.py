from fastapi import APIRouter, BackgroundTasks

from app.api.shared import download_public
from app.models.platform_requests import TwitterDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform

router = APIRouter(prefix="/twitter", tags=["twitter"])


@router.post("/download", response_model=DownloadResponse)
async def download_twitter(body: TwitterDownloadIn, background_tasks: BackgroundTasks):
    req = DownloadRequest(
        url=body.url,
        platform=Platform.TWITTER,
        quality=body.quality,
        extract_audio=body.extract_audio,
        include_metadata=body.include_metadata,
    )
    return await download_public(Platform.TWITTER, req, background_tasks)
