import os

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse

from app.api.shared import download_public
from app.models.platform_requests import YouTubeDownloadIn
from app.models.schemas import DownloadRequest, DownloadResponse, Platform
from app.state import public_downloader

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.post("/download", response_model=DownloadResponse)
async def download_youtube(body: YouTubeDownloadIn, background_tasks: BackgroundTasks):
    req = DownloadRequest(
        url=body.url,
        platform=Platform.YOUTUBE,
        quality=body.quality,
        extract_audio=body.extract_audio,
        include_metadata=body.include_metadata,
    )
    return await download_public(Platform.YOUTUBE, req, background_tasks)


@router.get("/file")
async def download_youtube_file(
    background_tasks: BackgroundTasks,
    url: str = Query(...),
    variant: str = Query("hd", pattern="^(hd|sd|audio)$"),
):
    try:
        result = await public_downloader.download_youtube_variant(url, variant)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"YouTube file download failed: {e}")

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
