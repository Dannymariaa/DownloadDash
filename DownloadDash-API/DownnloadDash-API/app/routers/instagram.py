from fastapi import APIRouter

from app.models.platform_requests import InstagramDownloadIn
from app.models.schemas import Platform
from app.state import universal_downloader

router = APIRouter(prefix="/instagram", tags=["instagram"])


@router.post("/download")
async def download_instagram(body: InstagramDownloadIn):
    """Download Instagram media (supports videos, photos, and albums)."""
    try:
        result = await universal_downloader.resolve_media(
            url=str(body.url),
            platform=Platform.INSTAGRAM,
            quality=body.quality,
            extract_audio=body.extract_audio,
            media_type=None,
            user_auth=None,
        )

        if not result or not result.get("direct_url"):
            return {
                "success": False,
                "message": "Resolve failed",
                "error": result.get("error", "Unknown error") if result else "Unknown error",
                "media_type": result.get("kind") if result else None,
            }

        kind = result.get("kind") or "video"
        media_type = "album" if kind == "album" else ("photo" if kind == "image" else "video")

        response = {
            "success": True,
            "message": "Media resolved successfully",
            "media_type": media_type,
            "download_url": result.get("direct_url"),
            "title": result.get("title"),
            "thumbnail_url": result.get("thumbnail"),
            "author_username": result.get("author_username"),
            "author_display_name": result.get("author_display_name") or result.get("author_username"),
            "like_count": result.get("like_count"),
            "comment_count": result.get("comment_count"),
            "available_qualities": result.get("available_qualities", []),
        }

        if media_type == "album":
            images = []
            downloads = result.get("downloads") or {}
            raw_images = downloads.get("images") or []
            for item in raw_images:
                if isinstance(item, dict) and item.get("url"):
                    images.append(item)
                elif isinstance(item, str):
                    images.append({"url": item})
            response["images"] = images
            response["count"] = len(images)

        if media_type == "video":
            response["duration"] = result.get("duration")
            response["width"] = result.get("width")
            response["height"] = result.get("height")
            response["file_format"] = result.get("ext")
            downloads = result.get("downloads") or {}
            if downloads.get("audio"):
                response["audio_url"] = downloads["audio"]

        return response

    except Exception as e:
        return {
            "success": False,
            "message": "Resolve failed",
            "error": str(e),
        }
