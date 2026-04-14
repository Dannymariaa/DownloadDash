from telethon import TelegramClient, events
from telethon.tl.types import (
    MessageMediaPhoto, MessageMediaDocument,
    MessageMediaWebPage, MessageMediaPoll,
    DocumentAttributeVideo, DocumentAttributeAudio,
    DocumentAttributeFilename, MessageMediaContact,
    MessageMediaGeo, MessageMediaVenue
)
from telethon.errors import SessionPasswordNeededError
import asyncio
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
import os
import uuid
from loguru import logger
import aiohttp

from app.platforms.base import BasePlatformDownloader
from app.models.schemas import DownloadRequest, Platform, Quality, MediaType
from app.utils import file_handler

class TelegramDownloader(BasePlatformDownloader):
    """Telegram downloader using Telethon"""
    
    def __init__(self, api_id: int = None, api_hash: str = None, session_path: str = "./auth/telegram"):
        super().__init__()
        self.api_id = api_id
        self.api_hash = api_hash
        self.session_path = session_path
        self.client = None
        self.is_connected = False
        self.message_handlers = []
        self.media_download_tasks = []
        
    async def initialize(self):
        """Initialize Telegram client"""
        if not self.api_id or not self.api_hash:
            logger.error("Telegram API credentials not provided")
            return False
        
        # Create session directory
        os.makedirs(self.session_path, exist_ok=True)
        
        session_file = os.path.join(self.session_path, "user_session")
        self.client = TelegramClient(session_file, self.api_id, self.api_hash)
        
        return True
    
    async def authenticate(self, credentials: dict = None) -> bool:
        """Authenticate with Telegram"""
        try:
            await self.client.connect()
            
            if not await self.client.is_user_authorized():
                if credentials and 'phone' in credentials:
                    # Send code request
                    await self.client.send_code_request(credentials['phone'])
                    
                    if 'code' in credentials:
                        # Sign in with code
                        await self.client.sign_in(credentials['phone'], credentials['code'])
                    elif 'password' in credentials:
                        # Two-factor authentication
                        await self.client.sign_in(password=credentials['password'])
                    else:
                        logger.info("Waiting for authentication code")
                        return False
                else:
                    logger.error("Phone number required for authentication")
                    return False
            
            self.is_connected = True
            me = await self.client.get_me()
            logger.info(f"Logged into Telegram as {me.username or me.first_name}")
            return True
            
        except SessionPasswordNeededError:
            logger.error("Two-factor authentication required")
            return False
        except Exception as e:
            logger.error(f"Telegram authentication failed: {e}")
            return False
    
    async def extract_info(self, url: str) -> Dict[str, Any]:
        """Extract Telegram message/channel information"""
        try:
            # Parse Telegram URL
            # Format: https://t.me/username/123 or https://t.me/c/1234567890/123
            parts = url.replace('https://', '').replace('http://', '').split('/')
            
            if 't.me' not in parts[0]:
                raise ValueError("Invalid Telegram URL")
            
            # Handle different URL formats
            if len(parts) >= 4:
                # https://t.me/username/123
                username = parts[1]
                message_id = int(parts[2])
                
                entity = await self.client.get_entity(username)
                message = await self.client.get_messages(entity, ids=message_id)
                
            elif len(parts) >= 3 and parts[1] == 'c':
                # https://t.me/c/1234567890/123
                chat_id = int(parts[2])
                message_id = int(parts[3])
                
                entity = await self.client.get_entity(chat_id)
                message = await self.client.get_messages(entity, ids=message_id)
            else:
                # Channel/group URL without specific message
                username = parts[1]
                entity = await self.client.get_entity(username)
                messages = await self.client.get_messages(entity, limit=1)
                message = messages[0] if messages else None
            
            if not message:
                return None
            
            return await self._extract_message_info(message, entity)
            
        except Exception as e:
            logger.error(f"Failed to extract Telegram info: {e}")
            raise
    
    async def download(self, request: DownloadRequest) -> Dict[str, Any]:
        """Download Telegram media"""
        try:
            url = str(request.url)
            
            # Parse URL to get message info
            info = await self.extract_info(url)
            
            if not info:
                return {'success': False, 'error': 'Message not found'}
            
            # Get the actual message object
            parts = url.split('/')
            if len(parts) >= 4:
                username = parts[-2]
                message_id = int(parts[-1])
                entity = await self.client.get_entity(username)
                message = await self.client.get_messages(entity, ids=message_id)
            else:
                return {'success': False, 'error': 'Invalid message URL'}
            
            # Download media
            if message.media:
                # Generate filename
                file_id = str(uuid.uuid4())
                ext = self._get_extension(message.media)
                filename = f"telegram_{file_id}{ext}"
                filepath = os.path.join(request.download_path or './downloads', filename)
                
                # Download
                downloaded_path = await message.download_media(file=filepath)
                
                if downloaded_path:
                    # Get file info
                    file_info = await file_handler.get_file_info(downloaded_path)
                    
                    return {
                        'success': True,
                        'filepath': downloaded_path,
                        'filename': filename,
                        'filesize': file_info['size'],
                        'mime_type': file_info['mime_type'],
                        'message_id': message.id,
                        'chat': info['chat'],
                        'date': info['date']
                    }
                else:
                    return {'success': False, 'error': 'Download failed'}
            else:
                return {'success': False, 'error': 'No media in message'}
                
        except Exception as e:
            logger.error(f"Telegram download failed: {e}")
            return {'success': False, 'error': str(e)}
    
    async def download_story(self, user_id: str, story_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Download Telegram stories (expiring media)"""
        downloaded = []
        
        try:
            # Get user entity
            entity = await self.client.get_entity(user_id)
            
            # Get stories (Telethon doesn't directly support stories yet)
            # This is a placeholder for when Telegram API adds story support
            logger.warning("Telegram stories not fully supported in API yet")
            
            return downloaded
            
        except Exception as e:
            logger.error(f"Failed to download Telegram stories: {e}")
            return downloaded
    
    async def download_channel_media(self, channel_username: str, limit: int = 50, 
                                     media_types: List[str] = None) -> List[Dict[str, Any]]:
        """Download multiple media from a channel"""
        downloaded = []
        
        try:
            entity = await self.client.get_entity(channel_username)
            
            # Get messages with media
            async for message in self.client.iter_messages(entity, limit=limit):
                if message.media:
                    # Check media type filter
                    if media_types:
                        media_type = self._get_media_type(message.media)
                        if media_type not in media_types:
                            continue
                    
                    # Download media
                    file_id = str(uuid.uuid4())
                    ext = self._get_extension(message.media)
                    filename = f"telegram_{channel_username}_{message.id}_{file_id}{ext}"
                    filepath = os.path.join('./downloads/telegram', filename)
                    
                    downloaded_path = await message.download_media(file=filepath)
                    
                    if downloaded_path:
                        file_info = await file_handler.get_file_info(downloaded_path)
                        downloaded.append({
                            'id': message.id,
                            'date': message.date.isoformat(),
                            'filepath': downloaded_path,
                            'filename': filename,
                            'filesize': file_info['size'],
                            'media_type': self._get_media_type(message.media),
                            'caption': message.text
                        })
            
            return downloaded
            
        except Exception as e:
            logger.error(f"Failed to download channel media: {e}")
            return downloaded
    
    async def download_profile_picture(self, username: str) -> Dict[str, Any]:
        """Download Telegram profile picture"""
        try:
            entity = await self.client.get_entity(username)
            
            # Get profile photo
            if entity.photo:
                # Download photo
                file_id = str(uuid.uuid4())
                filename = f"telegram_profile_{username}_{file_id}.jpg"
                filepath = os.path.join('./downloads/telegram/profiles', filename)
                
                downloaded_path = await self.client.download_profile_photo(
                    entity,
                    file=filepath
                )
                
                if downloaded_path:
                    file_info = await file_handler.get_file_info(downloaded_path)
                    return {
                        'success': True,
                        'filepath': downloaded_path,
                        'filename': filename,
                        'filesize': file_info['size'],
                        'username': username,
                        'full_name': getattr(entity, 'first_name', '') + ' ' + 
                                   getattr(entity, 'last_name', ''),
                        'bio': getattr(entity, 'about', '')
                    }
            
            return {'success': False, 'error': 'No profile picture'}
            
        except Exception as e:
            logger.error(f"Failed to download profile picture: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_user_info(self, username: str) -> Dict[str, Any]:
        """Get Telegram user/channel information"""
        try:
            entity = await self.client.get_entity(username)
            
            info = {
                'id': entity.id,
                'username': getattr(entity, 'username', None),
                'first_name': getattr(entity, 'first_name', None),
                'last_name': getattr(entity, 'last_name', None),
                'phone': getattr(entity, 'phone', None),
                'verified': getattr(entity, 'verified', False),
                'restricted': getattr(entity, 'restricted', False),
                'bot': getattr(entity, 'bot', False),
                'scam': getattr(entity, 'scam', False),
                'fake': getattr(entity, 'fake', False),
                'premium': getattr(entity, 'premium', False),
                'bio': getattr(entity, 'about', None),
            }
            
            # Add entity-specific info
            if hasattr(entity, 'participants_count'):
                info['participants'] = entity.participants_count
            if hasattr(entity, 'broadcast'):
                info['broadcast'] = entity.broadcast
            if hasattr(entity, 'megagroup'):
                info['megagroup'] = entity.megagroup
            if hasattr(entity, 'gigagroup'):
                info['gigagroup'] = entity.gigagroup
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get user info: {e}")
            return {}
    
    async def _extract_message_info(self, message, entity) -> Dict[str, Any]:
        """Extract message information"""
        info = {
            'id': message.id,
            'date': message.date.isoformat(),
            'text': message.text,
            'chat': {
                'id': entity.id,
                'title': getattr(entity, 'title', None),
                'username': getattr(entity, 'username', None),
                'type': self._get_entity_type(entity)
            },
            'views': message.views,
            'forwards': message.forwards,
            'replies': message.replies.replies if message.replies else None,
            'has_media': message.media is not None,
        }
        
        if message.media:
            info['media'] = {
                'type': self._get_media_type(message.media),
                'info': await self._get_media_info(message.media)
            }
        
        return info
    
    def _get_entity_type(self, entity):
        """Determine entity type"""
        if hasattr(entity, 'broadcast') and entity.broadcast:
            return 'channel'
        elif hasattr(entity, 'megagroup') and entity.megagroup:
            return 'supergroup'
        elif hasattr(entity, 'gigagroup') and entity.gigagroup:
            return 'gigagroup'
        elif hasattr(entity, 'bot'):
            return 'bot'
        elif hasattr(entity, 'first_name'):
            return 'user'
        else:
            return 'chat'
    
    def _get_media_type(self, media) -> str:
        """Get media type string"""
        if isinstance(media, MessageMediaPhoto):
            return 'photo'
        elif isinstance(media, MessageMediaDocument):
            # Check document type
            for attr in media.document.attributes:
                if isinstance(attr, DocumentAttributeVideo):
                    return 'video'
                elif isinstance(attr, DocumentAttributeAudio):
                    return 'audio'
                elif isinstance(attr, DocumentAttributeFilename):
                    # Check extension
                    ext = attr.file_name.split('.')[-1].lower()
                    if ext in ['mp3', 'm4a', 'ogg', 'wav']:
                        return 'audio'
                    elif ext in ['mp4', 'mkv', 'webm']:
                        return 'video'
                    elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
                        return 'image'
            return 'document'
        elif isinstance(media, MessageMediaWebPage):
            return 'webpage'
        elif isinstance(media, MessageMediaPoll):
            return 'poll'
        elif isinstance(media, MessageMediaContact):
            return 'contact'
        elif isinstance(media, (MessageMediaGeo, MessageMediaVenue)):
            return 'location'
        else:
            return 'unknown'
    
    async def _get_media_info(self, media) -> Dict[str, Any]:
        """Extract media information"""
        info = {}
        
        if isinstance(media, MessageMediaPhoto):
            info['width'] = media.photo.sizes[-1].w
            info['height'] = media.photo.sizes[-1].h
            info['size'] = media.photo.sizes[-1].size
            
        elif isinstance(media, MessageMediaDocument):
            info['size'] = media.document.size
            info['mime_type'] = media.document.mime_type
            
            for attr in media.document.attributes:
                if isinstance(attr, DocumentAttributeVideo):
                    info['width'] = attr.w
                    info['height'] = attr.h
                    info['duration'] = attr.duration
                    info['duration'] = attr.duration
                    info['video_codec'] = getattr(attr, 'video_codec', None)
                    info['supports_streaming'] = getattr(attr, 'supports_streaming', False)
                elif isinstance(attr, DocumentAttributeAudio):
                    info['duration'] = attr.duration
                    info['title'] = getattr(attr, 'title', None)
                    info['performer'] = getattr(attr, 'performer', None)
                    info['voice'] = getattr(attr, 'voice', False)
                elif isinstance(attr, DocumentAttributeFilename):
                    info['filename'] = attr.file_name
                    
        return info
    
    def _get_extension(self, media) -> str:
        """Get file extension from media"""
        if isinstance(media, MessageMediaPhoto):
            return '.jpg'
        elif isinstance(media, MessageMediaDocument):
            # Try to get extension from filename
            for attr in media.document.attributes:
                if isinstance(attr, DocumentAttributeFilename):
                    return f".{attr.file_name.split('.')[-1]}"
            
            # Fallback based on mime type
            mime = media.document.mime_type
            if mime:
                if mime.startswith('video/'):
                    return '.mp4'
                elif mime.startswith('audio/'):
                    return '.mp3'
                elif mime.startswith('image/'):
                    return '.jpg'
            
            return '.bin'
        else:
            return '.bin'
    
    async def add_message_handler(self, handler_func: Callable) -> None:
        """Add a handler for new messages"""
        if not self.message_handlers:
            # Set up the event handler if this is the first handler
            @self.client.on(events.NewMessage)
            async def handle_new_message(event):
                for handler in self.message_handlers:
                    try:
                        await handler(event)
                    except Exception as e:
                        logger.error(f"Message handler error: {e}")
        
        self.message_handlers.append(handler_func)
    
    async def listen_for_media(self, chat_filter: Optional[List[str]] = None, 
                              media_types: Optional[List[str]] = None,
                              auto_download: bool = True) -> None:
        """Listen for new media messages and optionally auto-download"""
        
        @self.client.on(events.NewMessage)
        async def media_listener(event):
            # Check if message has media
            if not event.message.media:
                return
            
            # Check chat filter
            if chat_filter:
                chat_id = str(event.chat_id)
                chat_username = getattr(event.chat, 'username', '')
                if chat_id not in chat_filter and chat_username not in chat_filter:
                    return
            
            # Get media type
            media_type = self._get_media_type(event.message.media)
            
            # Check media type filter
            if media_types and media_type not in media_types:
                return
            
            # Log the media event
            logger.info(f"New media in {event.chat.title or event.chat.username}: {media_type}")
            
            # Auto-download if enabled
            if auto_download:
                # Create download task
                task = asyncio.create_task(
                    self._auto_download_media(event.message, media_type)
                )
                self.media_download_tasks.append(task)
                
                # Clean up completed tasks
                self.media_download_tasks = [t for t in self.media_download_tasks if not t.done()]
    
    async def _auto_download_media(self, message, media_type: str) -> Optional[str]:
        """Auto-download media when detected"""
        try:
            # Generate filename
            file_id = str(uuid.uuid4())
            ext = self._get_extension(message.media)
            
            # Create subdirectory based on media type
            subdir = os.path.join('./downloads/telegram', media_type + 's')
            os.makedirs(subdir, exist_ok=True)
            
            # Add chat name to filename if available
            chat_name = getattr(message.chat, 'username', None) or str(message.chat_id)
            filename = f"{chat_name}_{message.id}_{file_id}{ext}"
            filepath = os.path.join(subdir, filename)
            
            # Download
            downloaded_path = await message.download_media(file=filepath)
            
            if downloaded_path:
                logger.info(f"Auto-downloaded {media_type}: {filename}")
                return downloaded_path
            else:
                logger.warning(f"Auto-download failed for message {message.id}")
                return None
                
        except Exception as e:
            logger.error(f"Auto-download error: {e}")
            return None
    
    async def download_multiple(self, urls: List[str], download_path: str = './downloads') -> List[Dict[str, Any]]:
        """Download media from multiple Telegram URLs"""
        results = []
        
        for url in urls:
            try:
                # Create a download request for each URL
                request = DownloadRequest(
                    url=url,
                    platform=Platform.TELEGRAM,
                    download_path=download_path
                )
                
                result = await self.download(request)
                results.append({
                    'url': url,
                    'success': result.get('success', False),
                    'filepath': result.get('filepath'),
                    'error': result.get('error')
                })
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.5)
                
            except Exception as e:
                results.append({
                    'url': url,
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    async def search_and_download(self, query: str, limit: int = 10, 
                                  media_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for messages and download media"""
        downloaded = []
        
        try:
            # Search for messages
            async for message in self.client.iter_messages(None, query=query, limit=limit):
                if message.media:
                    # Check media type filter
                    if media_type:
                        msg_media_type = self._get_media_type(message.media)
                        if msg_media_type != media_type:
                            continue
                    
                    # Download media
                    file_id = str(uuid.uuid4())
                    ext = self._get_extension(message.media)
                    filename = f"telegram_search_{message.id}_{file_id}{ext}"
                    filepath = os.path.join('./downloads/telegram/search', filename)
                    
                    downloaded_path = await message.download_media(file=filepath)
                    
                    if downloaded_path:
                        file_info = await file_handler.get_file_info(downloaded_path)
                        downloaded.append({
                            'id': message.id,
                            'date': message.date.isoformat(),
                            'chat': getattr(message.chat, 'title', None) or getattr(message.chat, 'username', None),
                            'text': message.text[:200] if message.text else '',
                            'filepath': downloaded_path,
                            'filename': filename,
                            'filesize': file_info['size'],
                            'media_type': self._get_media_type(message.media)
                        })
            
            return downloaded
            
        except Exception as e:
            logger.error(f"Search and download failed: {e}")
            return downloaded
    
    async def get_channel_stats(self, channel_username: str) -> Dict[str, Any]:
        """Get statistics for a Telegram channel"""
        try:
            entity = await self.client.get_entity(channel_username)
            
            # Get recent messages for stats
            messages = []
            async for msg in self.client.iter_messages(entity, limit=100):
                messages.append({
                    'id': msg.id,
                    'date': msg.date,
                    'views': msg.views,
                    'forwards': msg.forwards,
                    'replies': msg.replies.replies if msg.replies else 0,
                    'has_media': msg.media is not None
                })
            
            # Calculate statistics
            total_views = sum(m['views'] or 0 for m in messages)
            total_forwards = sum(m['forwards'] or 0 for m in messages)
            total_replies = sum(m['replies'] or 0 for m in messages)
            media_count = sum(1 for m in messages if m['has_media'])
            
            # Get date range
            if messages:
                oldest = min(m['date'] for m in messages)
                newest = max(m['date'] for m in messages)
                days_span = (newest - oldest).days
            else:
                oldest = newest = None
                days_span = 0
            
            return {
                'channel': {
                    'id': entity.id,
                    'username': entity.username,
                    'title': entity.title,
                    'participants': getattr(entity, 'participants_count', 0),
                },
                'stats': {
                    'messages_analyzed': len(messages),
                    'media_count': media_count,
                    'total_views': total_views,
                    'avg_views_per_post': total_views // len(messages) if messages else 0,
                    'total_forwards': total_forwards,
                    'avg_forwards_per_post': total_forwards // len(messages) if messages else 0,
                    'total_replies': total_replies,
                    'avg_replies_per_post': total_replies // len(messages) if messages else 0,
                    'date_range': {
                        'oldest': oldest.isoformat() if oldest else None,
                        'newest': newest.isoformat() if newest else None,
                        'days': days_span
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get channel stats: {e}")
            return {}
    
    async def disconnect(self):
        """Disconnect Telegram client"""
        if self.client:
            # Cancel any pending download tasks
            for task in self.media_download_tasks:
                if not task.done():
                    task.cancel()
            
            await self.client.disconnect()
            self.is_connected = False
            logger.info("Telegram client disconnected")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get connection status"""
        if not self.client:
            return {'connected': False, 'error': 'Client not initialized'}
        
        try:
            if self.is_connected:
                me = await self.client.get_me()
                return {
                    'connected': True,
                    'user': {
                        'id': me.id,
                        'username': me.username,
                        'first_name': me.first_name,
                        'phone': me.phone
                    },
                    'pending_downloads': len([t for t in self.media_download_tasks if not t.done()])
                }
            else:
                return {'connected': False}
        except Exception as e:
            return {'connected': False, 'error': str(e)}