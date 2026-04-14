import os
import shutil
import hashlib
import uuid
import asyncio
import aiofiles
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from pathlib import Path
import magic
import json
import re
from urllib.parse import urlparse
import httpx
from loguru import logger

from app.config import settings

class FileHandler:
    """Handle file operations"""
    
    @staticmethod
    async def save_file(content: bytes, filename: str, subdir: str = "") -> str:
        """Save file to disk"""
        save_dir = Path(settings.DOWNLOAD_PATH) / subdir
        save_dir.mkdir(parents=True, exist_ok=True)
        
        filepath = save_dir / filename
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(content)
        
        return str(filepath)

    @staticmethod
    def save_file_sync(content: bytes, filename: str, subdir: str = "") -> str:
        """Save file to disk (sync) for thread/executor contexts"""
        save_dir = Path(settings.DOWNLOAD_PATH) / subdir
        save_dir.mkdir(parents=True, exist_ok=True)

        filepath = save_dir / filename
        with open(filepath, "wb") as f:
            f.write(content)

        return str(filepath)
    
    @staticmethod
    async def get_file_info(filepath: str) -> dict:
        """Get file information"""
        path = Path(filepath)
        stats = path.stat()
        
        mime = magic.from_file(filepath, mime=True)
        
        return {
            'filename': path.name,
            'size': stats.st_size,
            'created': datetime.fromtimestamp(stats.st_ctime),
            'modified': datetime.fromtimestamp(stats.st_mtime),
            'mime_type': mime,
            'extension': path.suffix,
        }
    
    @staticmethod
    async def cleanup_old_files(max_age_hours: int = 24):
        """Remove files older than max_age_hours"""
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        download_path = Path(settings.DOWNLOAD_PATH)
        
        for filepath in download_path.rglob('*'):
            if filepath.is_file():
                mtime = datetime.fromtimestamp(filepath.stat().st_mtime)
                if mtime < cutoff:
                    filepath.unlink()
                    logger.info(f"Cleaned up old file: {filepath}")
    
    @staticmethod
    def get_safe_filename(url: str, suffix: str = "") -> str:
        """Generate safe filename from URL"""
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{timestamp}_{url_hash}{suffix}"

class URLDetector:
    """Detect platform and media type from URL"""
    
    PLATFORM_PATTERNS = {
        'instagram': [
            r'instagram\.com/p/([^/?]+)',
            r'instagram\.com/reel/([^/?]+)',
            r'instagram\.com/stories/([^/?]+)/([^/?]+)',
            r'instagram\.com/tv/([^/?]+)',
            r'instagram\.com/([^/?]+)/?$',  # Profile
        ],
        'tiktok': [
            r'tiktok\.com/@([^/]+)/video/(\d+)',
            r'tiktok\.com/@([^/]+)/photo/(\d+)',
            r'tiktok\.com/@([^/]+)/?$',  # Profile
            r'tiktok\.com/(\d+)',  # Short URL
        ],
        'facebook': [
            r'facebook\.com/watch/?\?v=(\d+)',
            r'facebook\.com/([^/]+)/videos/(\d+)',
            r'fb\.watch/([^/]+)',
            r'facebook\.com/stories/(\d+)',
            r'facebook\.com/([^/]+)/posts/(\d+)',
            r'facebook\.com/([^/]+)/?$',  # Profile
        ],
        'twitter': [
            r'twitter\.com/(\w+)/status/(\d+)',
            r'x\.com/(\w+)/status/(\d+)',
            r'twitter\.com/(\w+)/?$',  # Profile
        ],
        'youtube': [
            r'youtube\.com/watch\?v=([^&]+)',
            r'youtu\.be/([^/?]+)',
            r'youtube\.com/shorts/([^/?]+)',
            r'youtube\.com/@([^/]+)/?$',  # Channel
            r'youtube\.com/playlist\?list=([^&]+)',
        ],
        'reddit': [
            r'reddit\.com/r/([^/]+)/comments/([^/]+)',
            r'redd\.it/([^/]+)',
            r'reddit\.com/user/([^/]+)/?$',  # User
        ],
        'pinterest': [
            r'pinterest\.com/pin/(\d+)',
            r'pin\.it/([^/?]+)',
            r'pinterest\.com/([^/]+)/?$',  # Profile
        ],
        'telegram': [
            r't\.me/([^/]+)/(\d+)',
            r't\.me/([^/]+)/?$',  # Channel
            r'telegram\.org/?$',
        ],
        'whatsapp': [
            r'whatsapp\.com/channel/(\d+)',
            r'wa\.me/(\d+)',
        ],
        'threads': [
            r'threads\.net/@([^/]+)/post/([^/?]+)',
            r'threads\.net/@([^/]+)/?$',  # Profile
        ],
        'twitch': [
            r'twitch\.tv/(\w+)/clip/(\w+)',
            r'twitch\.tv/(\w+)/videos?(\d+)',
            r'twitch\.tv/(\w+)/?$',  # Channel
        ],
        'spotify': [
            r'spotify\.com/track/([^/?]+)',
            r'spotify\.com/album/([^/?]+)',
            r'spotify\.com/playlist/([^/?]+)',
            r'spotify\.com/episode/([^/?]+)',
            r'spotify\.com/show/([^/?]+)',
        ],
        'soundcloud': [
            r'soundcloud\.com/([^/]+)/([^/?]+)',
            r'soundcloud\.com/([^/]+)/?$',  # User
        ],
    }
    
    @classmethod
    def detect_platform(cls, url: str) -> Optional[str]:
        """Detect platform from URL"""
        url_lower = url.lower()
        
        for platform, patterns in cls.PLATFORM_PATTERNS.items():
            if any(re.search(pattern, url_lower) for pattern in patterns):
                return platform
        
        return None
    
    @classmethod
    def extract_content_id(cls, url: str, platform: str) -> Optional[str]:
        """Extract content ID from URL"""
        patterns = cls.PLATFORM_PATTERNS.get(platform, [])
        
        for pattern in patterns:
            match = re.search(pattern, url.lower())
            if match:
                return match.group(1) if match.groups() else None
        
        return None

class DownloadManager:
    """Manage download tasks"""
    
    def __init__(self):
        self.active_downloads = {}
        self.download_queue = asyncio.Queue()
        self.workers = []
    
    async def start_workers(self, num_workers: int = settings.MAX_WORKERS):
        """Start worker tasks"""
        for i in range(num_workers):
            worker = asyncio.create_task(self._worker(i))
            self.workers.append(worker)
    
    async def _worker(self, worker_id: int):
        """Worker process for downloads"""
        while True:
            try:
                download_id, request = await self.download_queue.get()
                logger.info(f"Worker {worker_id} processing download {download_id}")
                
                # Process download
                result = await self._process_download(download_id, request)
                
                # Update status
                self.active_downloads[download_id] = result
                
                self.download_queue.task_done()
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                self.download_queue.task_done()
    
    async def _process_download(self, download_id: str, request):
        """Process individual download"""
        # This will call the appropriate platform downloader
        pass
    
    async def add_download(self, request) -> str:
        """Add download to queue"""
        download_id = str(uuid.uuid4())
        await self.download_queue.put((download_id, request))
        self.active_downloads[download_id] = {'status': 'queued'}
        return download_id
    
    def get_status(self, download_id: str) -> dict:
        """Get download status"""
        return self.active_downloads.get(download_id, {'status': 'not_found'})

class WebhookNotifier:
    """Handle webhook notifications"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def send_notification(self, webhook_url: str, event: str, data: dict):
        """Send webhook notification"""
        try:
            payload = {
                'event': event,
                'timestamp': datetime.utcnow().isoformat(),
                'data': data
            }
            
            response = await self.client.post(webhook_url, json=payload)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Webhook notification failed: {e}")
            return False
    
    async def close(self):
        await self.client.aclose()

# Global instances
file_handler = FileHandler()
url_detector = URLDetector()
download_manager = DownloadManager()
webhook_notifier = WebhookNotifier()
