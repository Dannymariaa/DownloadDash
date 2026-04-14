import instaloader
import asyncio
from typing import Dict, Any, Optional, List
import os
import tempfile
import requests
from loguru import logger

from app.platforms.base import BasePlatformDownloader
from app.models.schemas import DownloadRequest
from app.utils import file_handler


class InstagramDownloader(BasePlatformDownloader):
    """Instagram-specific downloader with proper photo and video support"""
    
    def __init__(self):
        super().__init__()
        self.loader = None
        self.is_logged_in = False
        
    async def initialize(self):
        """Initialize Instaloader"""
        self.loader = instaloader.Instaloader(
            download_videos=True,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False,
            post_metadata_txt_pattern="",
            max_connection_attempts=3,
            request_timeout=30.0
        )
    
    async def authenticate(self, credentials: dict = None) -> bool:
        """Login to Instagram (optional - many posts work without login)"""
        try:
            if credentials and 'username' in credentials and 'password' in credentials:
                self.loader.login(credentials['username'], credentials['password'])
                self.is_logged_in = True
                logger.info(f"Logged into Instagram as {credentials['username']}")
            else:
                logger.info("Using Instagram in anonymous mode")
                self.is_logged_in = False
            return True
        except Exception as e:
            logger.error(f"Instagram authentication failed: {e}")
            return False
    
    async def extract_info(self, url: str) -> Dict[str, Any]:
        """Extract Instagram post information - works for photos AND videos"""
        loop = asyncio.get_event_loop()
        
        def extract():
            # Handle different URL types
            if '/p/' in url:
                # PHOTO POST - use instaloader
                shortcode = url.split('/')[-2] if url.endswith('/') else url.split('/')[-1]
                post = instaloader.Post.from_shortcode(self.loader.context, shortcode)
                
                return {
                    'id': post.shortcode,
                    'type': 'post',
                    'media_type': 'photo',  # Important: mark as photo
                    'title': post.title if hasattr(post, 'title') else '',
                    'caption': post.caption if hasattr(post, 'caption') else '',
                    'date': post.date_utc.isoformat() if post.date_utc else None,
                    'owner': post.owner_username,
                    'owner_id': post.owner_id,
                    'is_video': False,
                    'url': post.url,  # Direct image URL from instaloader
                    'thumbnail_url': post.url,
                    'like_count': post.likes,
                    'comment_count': post.comments,
                    'width': post.width,
                    'height': post.height
                }
                
            elif '/reel/' in url or '/tv/' in url:
                # VIDEO POST - use instaloader (or could use yt-dlp)
                shortcode = url.split('/')[-2] if url.endswith('/') else url.split('/')[-1]
                post = instaloader.Post.from_shortcode(self.loader.context, shortcode)
                
                return {
                    'id': post.shortcode,
                    'type': 'post',
                    'media_type': 'video',
                    'title': post.title if hasattr(post, 'title') else '',
                    'caption': post.caption if hasattr(post, 'caption') else '',
                    'date': post.date_utc.isoformat() if post.date_utc else None,
                    'owner': post.owner_username,
                    'owner_id': post.owner_id,
                    'is_video': True,
                    'video_url': post.video_url,
                    'thumbnail_url': post.url,
                    'view_count': post.video_view_count if post.is_video else None,
                    'like_count': post.likes,
                    'comment_count': post.comments,
                    'duration': post.video_duration if post.is_video else None,
                    'width': post.width,
                    'height': post.height
                }
                
            elif '/stories/' in url:
                # STORY - extract story info
                parts = url.split('/')
                username = parts[-3] if 'stories' in parts else None
                story_id = parts[-2] if parts[-2].isdigit() else None
                
                if username and story_id:
                    profile = instaloader.Profile.from_username(self.loader.context, username)
                    stories = self.loader.get_stories(userids=[profile.userid])
                    
                    for story in stories:
                        for item in story.get_items():
                            if str(item.mediaid) == story_id:
                                return {
                                    'id': item.mediaid,
                                    'type': 'story',
                                    'media_type': 'video' if item.is_video else 'photo',
                                    'date': item.date_utc.isoformat(),
                                    'owner': username,
                                    'owner_id': profile.userid,
                                    'is_video': item.is_video,
                                    'video_url': item.video_url if item.is_video else None,
                                    'url': item.url if not item.is_video else None,
                                    'thumbnail_url': item.url,
                                    'expires_at': item.expiring_utc.isoformat()
                                }
            
            return None
        
        try:
            info = await loop.run_in_executor(None, extract)
            return info
        except Exception as e:
            logger.error(f"Failed to extract Instagram info: {e}")
            return None
    
    async def download(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download Instagram post - works for photos and videos"""
        loop = asyncio.get_event_loop()
        
        def download_media():
            url = str(request.url)
            
            # Handle photo posts (/p/)
            if '/p/' in url:
                shortcode = url.split('/')[-2] if url.endswith('/') else url.split('/')[-1]
                post = instaloader.Post.from_shortcode(self.loader.context, shortcode)
                
                # Get the direct image URL
                image_url = post.url
                
                # Download the image
                response = requests.get(image_url)
                if response.status_code == 200:
                    filename = f"instagram_{shortcode}.jpg"
                    saved_path = file_handler.save_file_sync(response.content, filename, 'instagram')
                    
                    return {
                        'success': True,
                        'media_type': 'photo',
                        'downloads': {'image': saved_path},
                        'post_info': {
                            'id': post.shortcode,
                            'owner': post.owner_username,
                            'date': post.date_utc.isoformat(),
                            'is_video': False,
                            'media_type': 'photo'
                        }
                    }
                else:
                    return {'success': False, 'error': 'Failed to download image'}
            
            # Handle video posts (/reel/)
            elif '/reel/' in url:
                shortcode = url.split('/')[-2] if url.endswith('/') else url.split('/')[-1]
                post = instaloader.Post.from_shortcode(self.loader.context, shortcode)
                
                # Get video URL
                video_url = post.video_url
                
                # Download video
                response = requests.get(video_url)
                if response.status_code == 200:
                    filename = f"instagram_{shortcode}.mp4"
                    saved_path = file_handler.save_file_sync(response.content, filename, 'instagram')
                    
                    return {
                        'success': True,
                        'media_type': 'video',
                        'downloads': {'videoHD': saved_path, 'videoSD': saved_path},
                        'post_info': {
                            'id': post.shortcode,
                            'owner': post.owner_username,
                            'date': post.date_utc.isoformat(),
                            'is_video': True,
                            'media_type': 'video',
                            'duration': post.video_duration
                        }
                    }
                else:
                    return {'success': False, 'error': 'Failed to download video'}
            
            return {'success': False, 'error': 'Invalid URL type'}
        
        try:
            result = await loop.run_in_executor(None, download_media)
            return result
        except Exception as e:
            logger.error(f"Instagram download failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def download_profile_picture(self, username: str) -> Dict[str, Any]:
        """Download Instagram profile picture"""
        loop = asyncio.get_event_loop()
        
        def download_pp():
            profile = instaloader.Profile.from_username(self.loader.context, username)
            profile_pic_url = profile.profile_pic_url
            
            response = requests.get(profile_pic_url)
            if response.status_code == 200:
                filename = f"profile_{username}_pp.jpg"
                saved_path = file_handler.save_file_sync(response.content, filename, 'instagram/profiles')
                return {
                    'success': True,
                    'url': saved_path,
                    'media_type': 'photo',
                    'username': username,
                    'full_name': profile.full_name,
                    'biography': profile.biography,
                    'followers': profile.followers,
                    'following': profile.followees,
                    'posts': profile.mediacount
                }
            return {'success': False, 'error': 'Failed to download'}
        
        try:
            result = await loop.run_in_executor(None, download_pp)
            return result
        except Exception as e:
            logger.error(f"Failed to download profile picture: {e}")
            return {'success': False, 'error': str(e)}