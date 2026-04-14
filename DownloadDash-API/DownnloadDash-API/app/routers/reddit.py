from fastapi import APIRouter, BackgroundTasks

from app.api.shared import download_public
from app.models.platform_requests import RedditDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform

router = APIRouter(prefix="/reddit", tags=["reddit"])


@router.post("/download", response_model=DownloadResponse)
async def download_reddit(body: RedditDownloadIn, background_tasks: BackgroundTasks):
    req = DownloadRequest(
        url=body.url,
        platform=Platform.REDDIT,
        quality=body.quality,
        extract_audio=body.extract_audio,
        include_metadata=body.include_metadata,
    )
    return await download_public(Platform.REDDIT, req, background_tasks)
