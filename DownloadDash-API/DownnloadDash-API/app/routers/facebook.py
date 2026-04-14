from fastapi import APIRouter, BackgroundTasks

from app.api.shared import download_public
from app.models.platform_requests import FacebookDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform

router = APIRouter(prefix="/facebook", tags=["facebook"])


@router.post("/download", response_model=DownloadResponse)
async def download_facebook(body: FacebookDownloadIn, background_tasks: BackgroundTasks):
    req = DownloadRequest(
        url=body.url,
        platform=Platform.FACEBOOK,
        quality=body.quality,
        extract_audio=body.extract_audio,
        include_metadata=body.include_metadata,
    )
    return await download_public(Platform.FACEBOOK, req, background_tasks)
