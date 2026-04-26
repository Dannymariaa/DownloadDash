import os
import re

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
        raw_error = str(e)
        lowered = raw_error.lower()
        if "sign in to confirm" in lowered or "not a bot" in lowered or "captcha" in lowered:
            message = (
                "YouTube is blocking this server for the final file download. "
                "Refresh the YouTube cookies with a full logged-in browser export, then redeploy/restart the API. "
                "If it still happens, move the API to a less-blocked region/IP."
            )
        elif "requested format is not available" in lowered:
            message = "That YouTube quality is not available for this video. Try SD or audio."
        elif "tunnel connection failed" in lowered or ("proxy" in lowered and "403" in lowered):
            message = (
                "The configured YouTube proxy rejected the connection. "
                "Check the proxy username/password/session settings in Render, then redeploy the API."
            )
        elif "proxy" in lowered and ("407" in lowered or "authentication" in lowered):
            message = (
                "The configured YouTube proxy needs valid authentication. "
                "Update the proxy URL in Render and redeploy the API."
            )
        elif "ffmpeg" in lowered:
            message = (
                "The server could not finish the YouTube file conversion step. "
                "Install ffmpeg on the API server or use a direct progressive format fallback."
            )
        else:
            message = "YouTube file download failed. Please try again."

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
