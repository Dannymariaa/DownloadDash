import yt_dlp
import asyncio
from typing import Dict, Any, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InstagramResolver:
    """Handles Instagram media resolution for both videos and photos"""
    
    def __init__(self):
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'force_generic_extractor': False,
            'ignoreerrors': True,
        }
    
    async def resolve_media(self, url: str, quality: str = "high", extract_audio: bool = False) -> Dict[str, Any]:
        """
        Resolve Instagram media URL and return download information
        
        Args:
            url: Instagram post URL
            quality: Quality preference (high, medium, low)
            extract_audio: Whether to extract audio (for videos)
        
        Returns:
            Dictionary with media information and download URLs
        """
        try:
            # Run yt-dlp in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, self._extract_info, url)
            
            if not info:
                return {
                    'success': False,
                    'error': 'Failed to extract media information',
                    'media_type': None
                }

            # No media present (text-only, story/restricted, or unavailable)
            formats = info.get('formats') or []
            entries = info.get('entries') or []
            thumbnails = info.get('thumbnails') or []
            if len(formats) == 0 and len(entries) == 0 and len(thumbnails) == 0:
                return {
                    'success': False,
                    'error': 'This Instagram post contains no downloadable media (text-only post, story, or restricted content)',
                    'media_type': 'none',
                    'post_type': info.get('title', 'Unknown post')
                }
            
            # Determine media type
            media_type = self._determine_media_type(info, url)
            
            if media_type == 'video':
                return await self._handle_video(info, quality, extract_audio)
            elif media_type == 'photo':
                return await self._handle_photo(info, quality)
            elif media_type == 'album':
                return await self._handle_album(info, quality)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported media type: {media_type}',
                    'media_type': media_type,
                    'debug_info': {
                        'has_formats': len(formats) > 0,
                        'has_thumbnails': len(thumbnails) > 0,
                        'has_entries': len(entries) > 0,
                        'url_type': self._get_url_type(url)
                    }
                }
                
        except Exception as e:
            logger.error(f"Error resolving Instagram media: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'media_type': None
            }
    
    def _extract_info(self, url: str) -> Dict[str, Any]:
        """Extract info using yt-dlp"""
        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return info
        except Exception as e:
            logger.error(f"yt-dlp extraction error: {str(e)}")
            return None
    
    def _get_url_type(self, url: str) -> str:
        """Determine Instagram URL type from the URL string"""
        if '/reel/' in url:
            return 'reel'
        elif '/p/' in url:
            return 'post'
        elif '/stories/' in url:
            return 'story'
        elif '/tv/' in url:
            return 'igtv'
        else:
            return 'unknown'
    
    def _determine_media_type(self, info: Dict[str, Any], url: str = "") -> str:
        """Enhanced media type detection that prioritizes actual content type over formats"""
        logger.info(f"Determining media type for: {info.get('title', 'Unknown')}")
        logger.info(f"Keys present: {list(info.keys())}")
        
        # Get URL type if provided
        url_type = self._get_url_type(url) if url else 'unknown'

        # 1. Check if it's an album (multiple entries)
        if info.get('entries') and len(info.get('entries', [])) > 0:
            # Check if the first entry is a video
            first_entry = info.get('entries', [{}])[0]
            if first_entry.get('formats'):
                for fmt in first_entry.get('formats', []):
                    if fmt.get('vcodec') != 'none':
                        return 'album'  # Album with videos
            return 'album'  # Album with photos

        # 2. For /p/ URLs, prioritize checking if it's actually a photo
        if url_type == 'post':
            # Check if there are any video formats
            has_video = False
            if info.get('formats'):
                for fmt in info.get('formats', []):
                    if fmt.get('vcodec') != 'none':
                        has_video = True
                        break
            
            # If no video formats, it's a photo
            if not has_video:
                return 'photo'
            
            # If there are video formats but also high-resolution thumbnails,
            # it might be a video post - check dimensions
            thumbnails = info.get('thumbnails', [])
            for thumb in thumbnails:
                if thumb.get('width', 0) > 1000 and thumb.get('height', 0) > 1000:
                    # High-res thumbnail suggests it might be a photo
                    # But if there are video formats, it could be a video post
                    # Let's check if the formats are actually video
                    if has_video:
                        # Check if any format has reasonable video dimensions
                        for fmt in info.get('formats', []):
                            if fmt.get('vcodec') != 'none' and fmt.get('height', 0) > 100:
                                return 'video'
                    return 'photo'

        # 3. For /reel/ URLs, they are always videos
        if url_type == 'reel':
            return 'video'

        # 4. Check for video (has video formats with actual video codec)
        if info.get('formats'):
            for fmt in info.get('formats', []):
                if fmt.get('vcodec') != 'none':
                    # Make sure it's not just a thumbnail masquerading as video
                    if fmt.get('height', 0) > 100 or fmt.get('width', 0) > 100:
                        logger.info(f"Detected video format: {fmt.get('format_id')} at {fmt.get('height', 0)}p")
                        return 'video'
                # Audio-only formats are not videos
                if fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                    continue

        # 5. Check for photo (has thumbnails or direct image URL)
        if info.get('thumbnails') and len(info.get('thumbnails', [])) > 0:
            # Check if the best thumbnail is high resolution
            best_thumb = max(info.get('thumbnails', []), 
                           key=lambda t: t.get('width', 0) * t.get('height', 0), 
                           default={})
            if best_thumb.get('width', 0) > 500 or best_thumb.get('height', 0) > 500:
                return 'photo'
            # Even if resolution isn't high, if no video formats, it's a photo
            if not self._has_video_formats(info):
                return 'photo'

        # 6. Direct image URL
        if info.get('url') and info.get('ext') in ['jpg', 'jpeg', 'png', 'webp']:
            return 'photo'

        # 7. If we have formats but no video codecs, and we have thumbnails, it's a photo
        if info.get('formats') and not self._has_video_formats(info) and info.get('thumbnails'):
            return 'photo'

        # 8. Check extractor and URL patterns
        if info.get('extractor') == 'instagram':
            webpage_url = info.get('webpage_url', '')
            if '/reel/' in webpage_url:
                return 'video'
            if '/p/' in webpage_url:
                # For /p/ URLs, check if it's actually a video
                if self._has_video_formats(info):
                    # If there are video formats with reasonable height, it's a video
                    for fmt in info.get('formats', []):
                        if fmt.get('vcodec') != 'none' and fmt.get('height', 0) > 200:
                            return 'video'
                return 'photo'
            if '/tv/' in webpage_url:
                return 'video'

        return 'unknown'

    def _has_video_formats(self, info: Dict[str, Any]) -> bool:
        """Check if any formats have video codecs with reasonable dimensions"""
        for fmt in info.get('formats', []):
            if fmt.get('vcodec') != 'none':
                # Check if it's a real video (not just a tiny thumbnail format)
                if fmt.get('height', 0) > 100 or fmt.get('width', 0) > 100:
                    return True
        return False

    def _is_video_from_thumbnails(self, info: Dict[str, Any]) -> bool:
        """Try to detect if it's a video from thumbnail patterns"""
        thumbnails = info.get('thumbnails', [])
        for thumb in thumbnails:
            if thumb.get('id') and 'video' in str(thumb.get('id')).lower():
                return True
        return False
    
    async def _handle_video(self, info: Dict[str, Any], quality: str, extract_audio: bool) -> Dict[str, Any]:
        """Handle video posts"""
        formats = info.get('formats', [])
        
        # Filter for video formats
        video_formats = [f for f in formats if f.get('vcodec') != 'none' and f.get('height', 0) > 100]
        
        if not video_formats:
            return {
                'success': False,
                'error': 'No video formats found',
                'media_type': 'video'
            }
        
        # Sort by quality
        if quality == 'high':
            # Get highest quality
            best_format = max(video_formats, key=lambda f: f.get('height', 0))
        elif quality == 'medium':
            # Get medium quality (around 720p)
            medium_formats = [f for f in video_formats if 400 <= f.get('height', 0) <= 800]
            best_format = medium_formats[-1] if medium_formats else video_formats[-1]
        else:
            # Get lowest quality
            best_format = min(video_formats, key=lambda f: f.get('height', 9999))
        
        result = {
            'success': True,
            'media_type': 'video',
            'download_url': best_format.get('url'),
            'title': info.get('title', 'Instagram Video'),
            'thumbnail_url': info.get('thumbnail'),
            'duration': info.get('duration'),
            'width': best_format.get('width'),
            'height': best_format.get('height'),
            'file_format': best_format.get('ext', 'mp4'),
            'author_username': info.get('uploader'),
            'author_display_name': info.get('uploader'),
            'like_count': info.get('like_count'),
            'comment_count': info.get('comment_count'),
            'available_qualities': [
                {
                    'quality': f"{f.get('height')}p" if f.get('height') else 'Unknown',
                    'url': f.get('url'),
                    'format': f.get('ext')
                }
                for f in video_formats
            ]
        }
        
        # Extract audio if requested
        if extract_audio:
            audio_formats = [f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
            if audio_formats:
                result['audio_url'] = audio_formats[-1].get('url')
        
        return result
    
    async def _handle_photo(self, info: Dict[str, Any], quality: str) -> Dict[str, Any]:
        """Handle single photo posts - enhanced to work with both thumbnail and format data"""
        image_url = None
        thumbnails = []
        
        # Try multiple sources for image URL
        # Source 1: Direct thumbnails
        if info.get('thumbnails'):
            thumbnails = info.get('thumbnails', [])
        
        # Source 2: Formats that are actually images
        if info.get('formats'):
            for fmt in info.get('formats', []):
                if fmt.get('ext') in ['jpg', 'jpeg', 'png', 'webp']:
                    thumbnails.append({
                        'url': fmt.get('url'),
                        'width': fmt.get('width'),
                        'height': fmt.get('height')
                    })
                # Some Instagram photos appear as formats with url but no extension
                elif fmt.get('url') and not fmt.get('vcodec') and not fmt.get('acodec'):
                    thumbnails.append({
                        'url': fmt.get('url'),
                        'width': fmt.get('width'),
                        'height': fmt.get('height')
                    })
        
        # Source 3: Direct URL from info
        if info.get('url') and info.get('ext') in ['jpg', 'jpeg', 'png', 'webp']:
            thumbnails.append({
                'url': info.get('url'),
                'width': info.get('width'),
                'height': info.get('height')
            })
        
        if not thumbnails:
            return {
                'success': False,
                'error': 'No photo URLs found',
                'media_type': 'photo',
                'debug_info': {
                    'has_formats': bool(info.get('formats')),
                    'has_thumbnails': bool(info.get('thumbnails')),
                    'has_url': bool(info.get('url'))
                }
            }
        
        # Remove duplicates by URL
        seen_urls = set()
        unique_thumbnails = []
        for t in thumbnails:
            if t.get('url') not in seen_urls:
                seen_urls.add(t.get('url'))
                unique_thumbnails.append(t)
        
        # Sort by resolution
        thumbnails_sorted = sorted(
            unique_thumbnails, 
            key=lambda t: (t.get('width', 0) or 0) * (t.get('height', 0) or 0), 
            reverse=True
        )
        
        # Get best quality based on preference
        if quality == 'high':
            best_thumbnail = thumbnails_sorted[0] if thumbnails_sorted else None
        elif quality == 'medium':
            medium_thumbnails = [t for t in thumbnails_sorted if 300 <= (t.get('width', 0) or 0) <= 800]
            best_thumbnail = medium_thumbnails[0] if medium_thumbnails else (thumbnails_sorted[-1] if thumbnails_sorted else None)
        else:
            best_thumbnail = thumbnails_sorted[-1] if thumbnails_sorted else None
        
        if not best_thumbnail:
            return {
                'success': False,
                'error': 'No suitable photo URL found',
                'media_type': 'photo'
            }
        
        return {
            'success': True,
            'media_type': 'photo',
            'download_url': best_thumbnail.get('url'),
            'title': info.get('title', 'Instagram Photo'),
            'thumbnail_url': best_thumbnail.get('url'),
            'width': best_thumbnail.get('width'),
            'height': best_thumbnail.get('height'),
            'file_format': 'jpg',
            'author_username': info.get('uploader'),
            'author_display_name': info.get('uploader'),
            'like_count': info.get('like_count'),
            'comment_count': info.get('comment_count'),
            'available_qualities': [
                {
                    'quality': f"{t.get('width')}x{t.get('height')}" if t.get('width') else 'Unknown',
                    'url': t.get('url'),
                    'format': 'jpg'
                }
                for t in thumbnails_sorted
            ]
        }
    
    async def _handle_album(self, info: Dict[str, Any], quality: str) -> Dict[str, Any]:
        """Handle photo albums (multiple images)"""
        entries = info.get('entries', [])
        
        if not entries:
            return {
                'success': False,
                'error': 'No album entries found',
                'media_type': 'album'
            }
        
        # Extract all images from the album
        images = []
        for entry in entries:
            thumbnails = []
            
            # Get thumbnails from entry
            if entry.get('thumbnails'):
                thumbnails = entry.get('thumbnails', [])
            elif entry.get('formats'):
                for fmt in entry.get('formats', []):
                    if fmt.get('ext') in ['jpg', 'jpeg', 'png', 'webp']:
                        thumbnails.append({
                            'url': fmt.get('url'),
                            'width': fmt.get('width'),
                            'height': fmt.get('height')
                        })
            
            if thumbnails:
                thumbnails_sorted = sorted(thumbnails, 
                                         key=lambda t: t.get('width', 0) * t.get('height', 0), 
                                         reverse=True)
                
                if quality == 'high':
                    best_image = thumbnails_sorted[0] if thumbnails_sorted else None
                elif quality == 'medium':
                    medium_images = [t for t in thumbnails_sorted if 300 <= t.get('width', 0) <= 800]
                    best_image = medium_images[0] if medium_images else thumbnails_sorted[-1]
                else:
                    best_image = thumbnails_sorted[-1] if thumbnails_sorted else None
                
                if best_image:
                    images.append({
                        'url': best_image.get('url'),
                        'width': best_image.get('width'),
                        'height': best_image.get('height'),
                        'thumbnail': entry.get('thumbnail')
                    })
        
        return {
            'success': True,
            'media_type': 'album',
            'images': images,
            'count': len(images),
            'title': info.get('title', 'Instagram Album'),
            'author_username': info.get('uploader'),
            'author_display_name': info.get('uploader'),
            'like_count': info.get('like_count'),
            'comment_count': info.get('comment_count')
        }


# Singleton instance
resolver = InstagramResolver()


async def resolve_instagram_media(url: str, quality: str = "high", extract_audio: bool = False) -> Dict[str, Any]:
    """Public function to resolve Instagram media"""
    return await resolver.resolve_media(url, quality, extract_audio)