from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import asyncio
from datetime import datetime
import aiohttp
from loguru import logger

from app.models.schemas import DownloadRequest, MediaInfo, Platform, Quality, MediaType
from app.utils import file_handler

class BasePlatformDownloader(ABC):
    """Base class for all platform downloaders"""
    
    def __init__(self):
        self.session = None
        self.is_authenticated = False
        self.auth_token = None
        
    @abstractmethod
    async def initialize(self):
        """Initialize platform-specific client"""
        pass
    
    @abstractmethod
    async def authenticate(self, credentials: dict = None) -> bool:
        """Authenticate with platform"""
        pass
    
    @abstractmethod
    async def extract_info(self, url: str) -> Dict[str, Any]:
        """Extract media information without downloading"""
        pass
    
    @abstractmethod
    async def download(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download media"""
        pass
    
    @abstractmethod
    async def download_story(self, user_id: str, story_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Download stories"""
        pass
    
    @abstractmethod
    async def download_highlight(self, user_id: str, highlight_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Download highlights"""
        pass
    
    @abstractmethod
    async def download_profile_picture(self, username: str) -> Dict[str, Any]:
        """Download profile picture"""
        pass
    
    @abstractmethod
    async def get_user_info(self, username: str) -> Dict[str, Any]:
        """Get user information"""
        pass
    
    async def close(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
    
    def _create_session(self):
        """Create aiohttp session"""
        return aiohttp.ClientSession()
    
    async def _download_file(self, url: str, filename: str) -> str:
        """Download file from URL"""
        if not self.session:
            self.session = await self._create_session()
        
        async with self.session.get(url) as response:
            response.raise_for_status()
            content = await response.read()
            return await file_handler.save_file(content, filename)
    
    def _parse_duration(self, duration_str: str) -> Optional[float]:
        """Parse duration string to seconds"""
        try:
            # Handle different duration formats
            if ':' in duration_str:
                parts = duration_str.split(':')
                if len(parts) == 2:
                    return int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            return float(duration_str)
        except (ValueError, TypeError):
            return None