from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, HttpUrl

from app.api.security import require_api_key
from app.state import gallery_downloader

router = APIRouter(prefix="/gallery", tags=["gallery-dl"])


class GalleryResolveIn(BaseModel):
    url: HttpUrl
    limit: int = Field(default=25, ge=1, le=100)


class GalleryDownloadIn(BaseModel):
    url: HttpUrl
    limit: int = Field(default=50, ge=1, le=200)


@router.post("/resolve")
async def resolve_gallery(
    body: GalleryResolveIn,
    _auth: None = Depends(require_api_key),
):
    """Resolve public images/videos/audio from gallery-dl without downloading files."""
    try:
        return await gallery_downloader.resolve(str(body.url), limit=body.limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/download")
async def start_gallery_download(
    body: GalleryDownloadIn,
    _auth: None = Depends(require_api_key),
):
    """Start a background gallery-dl download job for images, videos, audio, stories, or status URLs."""
    return gallery_downloader.start_download(str(body.url), limit=body.limit)


@router.get("/jobs/{job_id}")
async def get_gallery_job(
    job_id: str,
    _auth: None = Depends(require_api_key),
):
    job = gallery_downloader.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download job not found")
    return job


@router.delete("/jobs/{job_id}")
async def delete_gallery_job(
    job_id: str,
    _auth: None = Depends(require_api_key),
):
    deleted = gallery_downloader.clear_job(job_id)
    return {"success": deleted, "job_id": job_id}


@router.get("/file/{job_id}/{filename:path}")
async def get_gallery_file(
    job_id: str,
    filename: str,
    _auth: None = Depends(require_api_key),
):
    path = gallery_downloader.get_job_file(job_id, filename)
    if not path:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=path.name)
