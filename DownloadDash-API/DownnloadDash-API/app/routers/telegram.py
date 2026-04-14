import traceback
from fastapi import APIRouter
from typing import Optional
from datetime import datetime

try:
    from ..logs import logger
except:
    import logging
    logger = logging.getLogger("telegram_router")
    logging.basicConfig(level=logging.DEBUG)

from ..models.schemas import DownloadRequest, DownloadResponse, MediaInfo, MediaType, Platform, DownloadStatus, get_media_type
from ..platforms.telegram_simple import TelegramDownloader

router = APIRouter(prefix="/telegram", tags=["telegram"])

@router.post("/download", response_model=DownloadResponse)
async def download_telegram(request: DownloadRequest):
    """Download Telegram stories, messages, and media"""
    
    print("\n" + "="*60)
    print(f"📥 TELEGRAM DOWNLOAD ATTEMPT")
    print(f"URL: {request.url}")
    print("="*60)
    
    try:
        logger.info(f"Starting Telegram download for URL: {request.url}")
        
        downloader = TelegramDownloader()
        await downloader.initialize()
        
        media_info = await downloader.extract_info(str(request.url))
        
        if not media_info:
            return DownloadResponse(
                success=False,
                message="Could not extract media info",
                status=DownloadStatus.FAILED,
                error="No media info extracted",
                warnings=[]
            )
        
        download_result = await downloader.download(request)
        
        media_type_str = media_info.get('media_type', 'image')
        media_type = get_media_type(media_type_str)
        
        media_info_obj = MediaInfo(
            id=media_info.get('id', ''),
            platform=Platform.TELEGRAM,
            media_type=media_type,
            url=media_info.get('url', ''),
            title=media_info.get('title', 'Telegram Media'),
            description=media_info.get('description', ''),
            thumbnail_url=media_info.get('thumbnail_url', ''),
            download_url=download_result.get('files', [None])[0] if download_result.get('files') else None,
            duration=media_info.get('duration', 0),
            width=media_info.get('width', 0),
            height=media_info.get('height', 0),
            author_username=media_info.get('author', ''),
            file_size=media_info.get('file_size', 0)
        )
        
        downloads = {}
        if download_result.get('files'):
            if media_type == MediaType.VIDEO:
                downloads['video'] = download_result['files'][0]
            elif media_type == MediaType.AUDIO:
                downloads['audio'] = download_result['files'][0]
            else:
                downloads['image'] = download_result['files'][0]
        
        if download_result.get('success'):
            return DownloadResponse(
                success=True,
                message=f"Telegram {media_type.value} saved successfully",
                download_id=media_info.get('id', ''),
                status=DownloadStatus.COMPLETED,
                media_info=media_info_obj,
                download_url=download_result.get('files', [None])[0],
                downloads=downloads,
                warnings=[]
            )
        else:
            return DownloadResponse(
                success=False,
                message="Download failed",
                status=DownloadStatus.FAILED,
                error=download_result.get('error', 'Unknown error'),
                warnings=[]
            )
            
    except Exception as e:
        logger.error(f"Telegram download failed: {e}")
        return DownloadResponse(
            success=False,
            message=f"Download failed: {str(e)}",
            status=DownloadStatus.FAILED,
            error=str(e),
            warnings=[]
        )
