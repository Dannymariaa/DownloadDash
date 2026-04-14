import yt_dlp
import asyncio
from typing import Dict, Any, Optional, List
import os
import uuid
import json
from datetime import datetime
from loguru import logger

from app.platforms.base import BasePlatformDownloader
from app.models.schemas import DownloadRequest, Platform, Quality, MediaType
from app.utils import file_handler, url_detector

class PublicPlatformDownloader(BasePlatformDownloader):
    """Downloader for public platforms using yt-dlp"""
    
    def __init__(self):
        super().__init__()
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'noplaylist': True,
            'restrictfilenames': True,
            'ignoreerrors': True,
            'no_color': True,
            'geo_bypass': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Format specifications for different qualities
        self.quality_formats = {
            Quality.LOWEST: 'worst[ext=mp4]/worst',
            Quality.LOW: 'best[height<=360][ext=mp4]/best[height<=360]',
            Quality.MEDIUM: 'best[height<=480][ext=mp4]/best[height<=480]',
            Quality.HIGH: 'best[height<=720][ext=mp4]/best[height<=720]',
            Quality.HIGHEST: 'best[ext=mp4]/best',
            Quality.P144: 'best[height=144][ext=mp4]',
            Quality.P240: 'best[height=240][ext=mp4]',
            Quality.P360: 'best[height=360][ext=mp4]',
            Quality.P480: 'best[height=480][ext=mp4]',
            Quality.P720: 'best[height=720][ext=mp4]',
            Quality.P1080: 'best[height=1080][ext=mp4]',
            Quality.P1440: 'best[height=1440][ext=mp4]',
            Quality.P2160: 'best[height=2160][ext=mp4]',
            Quality.AUDIO_ONLY: 'bestaudio/best',
            Quality.VIDEO_ONLY: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
        }
        
        # Supported platforms
        self.supported_platforms = [
            Platform.INSTAGRAM,
            Platform.TIKTOK,
            Platform.FACEBOOK,
            Platform.REDDIT,
            Platform.PINTEREST,
            Platform.TWITTER,
            Platform.X,
            Platform.YOUTUBE,
            Platform.LINKEDIN,
            Platform.THREADS,
            Platform.TWITCH,
            Platform.VIMEO,
            Platform.DAILYMOTION,
            Platform.SPOTIFY,
            Platform.SOUNDCLOUD,
        ]
    
    async def initialize(self):
        """Initialize downloader"""
        pass
    
    async def authenticate(self, credentials: dict = None) -> bool:
        """Not needed for public platforms"""
        return True
    
    async def extract_info(self, url: str) -> Dict[str, Any]:
        """Extract media information"""
        loop = asyncio.get_event_loop()
        
        def extract():
            with yt_dlp.YoutubeDL({'quiet': True, 'extract_flat': True}) as ydl:
                return ydl.extract_info(url, download=False)
        
        try:
            info = await loop.run_in_executor(None, extract)
            
            # Parse available formats
            formats = []
            if 'formats' in info:
                for f in info['formats']:
                    if f.get('height') or f.get('vcodec') != 'none':
                        formats.append({
                            'format_id': f.get('format_id'),
                            'ext': f.get('ext'),
                            'height': f.get('height'),
                            'width': f.get('width'),
                            'filesize': f.get('filesize'),
                            'tbr': f.get('tbr'),
                            'vcodec': f.get('vcodec'),
                            'acodec': f.get('acodec')
                        })
            
            # Parse thumbnails
            thumbnails = []
            if 'thumbnails' in info:
                for t in info['thumbnails']:
                    thumbnails.append({
                        'url': t.get('url'),
                        'width': t.get('width'),
                        'height': t.get('height'),
                        'id': t.get('id')
                    })
            
            return {
                'id': info.get('id'),
                'title': info.get('title'),
                'description': info.get('description'),
                'duration': info.get('duration'),
                'uploader': info.get('uploader'),
                'uploader_id': info.get('uploader_id'),
                'upload_date': info.get('upload_date'),
                'view_count': info.get('view_count'),
                'like_count': info.get('like_count'),
                'comment_count': info.get('comment_count'),
                'thumbnails': thumbnails,
                'formats': formats,
                'extractor': info.get('extractor'),
                'webpage_url': info.get('webpage_url')
            }
        except Exception as e:
            logger.error(f"Failed to extract info from {url}: {e}")
            raise
    
    async def download(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download media"""
        loop = asyncio.get_event_loop()
        
        # Generate output template
        download_id = str(uuid.uuid4())
        output_template = os.path.join(
            request.download_path or './downloads',
            f"{download_id}.%(ext)s"
        )
        
        # Configure yt-dlp options
        ydl_opts = self.ydl_opts.copy()
        ydl_opts['format'] = self.quality_formats.get(
            request.quality,
            'best[ext=mp4]/best'
        )
        ydl_opts['outtmpl'] = output_template
        
        # Add authentication if provided
        if request.user_auth:
            if request.user_auth.cookies:
                ydl_opts['cookiefile'] = 'cookies.txt'
            if request.user_auth.username and request.user_auth.password:
                ydl_opts['username'] = request.user_auth.username
                ydl_opts['password'] = request.user_auth.password
        
        def download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(str(request.url), download=True)
                filename = ydl.prepare_filename(info)
                return {
                    'filepath': filename,
                    'info': info
                }
        
        try:
            result = await loop.run_in_executor(None, download)
            
            # Get file info
            file_info = await file_handler.get_file_info(result['filepath'])
            
            return {
                'success': True,
                'filepath': result['filepath'],
                'filename': os.path.basename(result['filepath']),
                'filesize': file_info['size'],
                'mime_type': file_info['mime_type'],
                'title': result['info'].get('title'),
                'duration': result['info'].get('duration'),
                'extractor': result['info'].get('extractor'),
                'format': result['info'].get('ext'),
                'width': result['info'].get('width'),
                'height': result['info'].get('height'),
                'fps': result['info'].get('fps'),
                'vcodec': result['info'].get('vcodec'),
                'acodec': result['info'].get('acodec')
            }
        except Exception as e:
            logger.error(f"Download failed for {request.url}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def download_story(self, user_id: str, story_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Download stories (implemented in specific platform classes)"""
        return []
    
    async def download_highlight(self, user_id: str, highlight_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Download highlights (implemented in specific platform classes)"""
        return []
    
    async def download_profile_picture(self, username: str) -> Dict[str, Any]:
        """Download profile picture (implemented in specific platform classes)"""
        return {}
    
    async def get_user_info(self, username: str) -> Dict[str, Any]:
        """Get user info (implemented in specific platform classes)"""
        return {}
    
    def get_supported_platforms(self) -> list:
        """Return list of supported platforms"""
        return self.supported_platforms
