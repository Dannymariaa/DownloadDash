import asyncio
import re
from typing import Any, Dict, Optional

import httpx

from app.config import settings
from app.models.schemas import MediaType, Platform, Quality, UserAuth
from app.platforms.public_platforms import PublicPlatformDownloader

try:
    import instaloader  # type: ignore
    _HAS_INSTALOADER = True
except Exception:
    instaloader = None
    _HAS_INSTALOADER = False

try:
    from instagrapi import Client as InstaClient  # type: ignore
    _HAS_INSTAGRAPI = True
except Exception:
    InstaClient = None
    _HAS_INSTAGRAPI = False

try:
    from social_media_downloader import download as sm_download  # type: ignore
    _HAS_SMD = True
except Exception:
    sm_download = None
    _HAS_SMD = False

try:
    # Optional TikTok Content Scraper (unofficial).
    from tiktok_content_scraper import TikTokScraper  # type: ignore
    _HAS_TIKTOK_SCRAPER = True
except Exception:
    TikTokScraper = None
    _HAS_TIKTOK_SCRAPER = False


class UniversalMediaDownloader:
    """
    Universal resolver for photos, videos, and stories across platforms.
    Uses platform-specific libraries for images where yt-dlp is weak,
    and delegates video resolution to yt-dlp.
    """

    def __init__(self, public_downloader: PublicPlatformDownloader):
        self.public_downloader = public_downloader

    async def resolve_media(
        self,
        url: str,
        platform: Platform,
        quality: Quality,
        extract_audio: bool = False,
        media_type: Optional[MediaType] = None,
        user_auth: Optional[UserAuth] = None,
    ) -> Dict[str, Any]:
        if platform == Platform.INSTAGRAM:
            return await self._resolve_instagram(url, quality, extract_audio, media_type, user_auth)
        if platform == Platform.TIKTOK:
            return await self._resolve_tiktok(url, quality, extract_audio, media_type)
        if platform == Platform.PINTEREST:
            return await self._resolve_pinterest(url)
        if platform in (Platform.TWITTER, Platform.X):
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)
        if platform in (Platform.FACEBOOK, Platform.REDDIT, Platform.YOUTUBE):
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)

        # Fall back to yt-dlp for any other supported public platform.
        try:
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)
        except Exception as e:
            msg = str(e)
            lower = msg.lower()
            if "no video formats found" in lower or "no formats found" in lower:
                return {
                    "error": (
                        "Instagram blocked anonymous access to this post. "
                        "Fix: provide cookies (SMD_YTDLP_COOKIEFILE) or login credentials."
                    ),
                    "kind": "image",
                }
            return {
                "error": msg,
                "kind": "unknown",
            }

    async def _resolve_instagram(
        self,
        url: str,
        quality: Quality,
        extract_audio: bool,
        media_type: Optional[MediaType],
        user_auth: Optional[UserAuth],
    ) -> Dict[str, Any]:
        url_lower = url.lower()
        is_story = "/stories/" in url_lower or media_type in (MediaType.STORY, MediaType.STATUS)
        is_reel = "/reel/" in url_lower or "/tv/" in url_lower or media_type in (MediaType.REEL, MediaType.VIDEO)
        is_post = "/p/" in url_lower or media_type in (MediaType.PHOTO, MediaType.IMAGE, MediaType.POST, MediaType.CAROUSEL, MediaType.ALBUM)

        # Stories usually require auth.
        if is_story:
            story = await self._resolve_instagram_story(url, user_auth)
            if story:
                return story
            # Fall back to yt-dlp as a last resort.
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)

        # Reels/videos: use yt-dlp.
        if is_reel and not is_post:
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)

        # Posts: try instaloader for photos/albums first, then IG fallbacks.
        post = await self._resolve_instagram_post(url, user_auth)
        if post:
            return post

        fallback = await self._resolve_instagram_fallbacks(url)
        if fallback:
            return fallback

        return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)

    async def _resolve_instagram_post(self, url: str, user_auth: Optional[UserAuth]) -> Optional[Dict[str, Any]]:
        if not _HAS_INSTALOADER:
            return None

        shortcode = self._extract_instagram_shortcode(url)
        if not shortcode:
            return None

        def _extract() -> Optional[Dict[str, Any]]:
            loader = instaloader.Instaloader(
                download_videos=False,
                download_video_thumbnails=False,
                save_metadata=False,
                compress_json=False,
                quiet=True,
            )

            creds = self._pick_instagram_credentials(user_auth)
            if creds:
                try:
                    loader.login(creds["username"], creds["password"])
                except Exception:
                    # Login may fail for public posts; continue anonymously.
                    pass

            try:
                post = instaloader.Post.from_shortcode(loader.context, shortcode)
            except Exception:
                return None

            # Albums (sidecar) - return the best image and include list.
            if getattr(post, "typename", "") == "GraphSidecar":
                images = []
                for node in post.get_sidecar_nodes():
                    if node.is_video:
                        continue
                    if node.display_url:
                        images.append({
                            "url": node.display_url,
                            "width": node.display_url_width,
                            "height": node.display_url_height,
                        })

                primary = images[0]["url"] if images else post.url
                return {
                    "direct_url": primary,
                    "title": post.title or "Instagram Post",
                    "thumbnail": primary,
                    "ext": "jpg",
                    "filesize": None,
                    "kind": "album" if images else "image",
                    "downloads": {
                        "image": primary,
                        "images": images,
                    },
                    "author_username": post.owner_username,
                    "author_display_name": post.owner_username,
                    "like_count": post.likes,
                    "comment_count": post.comments,
                }

            if post.is_video:
                if post.video_url:
                    return {
                        "direct_url": post.video_url,
                        "title": post.title or "Instagram Video",
                        "thumbnail": post.url,
                        "ext": "mp4",
                        "filesize": None,
                        "kind": "video",
                        "downloads": {
                            "videoHD": post.video_url,
                            "videoSD": post.video_url,
                            "image": post.url,
                        },
                        "author_username": post.owner_username,
                        "author_display_name": post.owner_username,
                        "like_count": post.likes,
                        "comment_count": post.comments,
                        "duration": post.video_duration,
                    }
                return None

            if post.url:
                return {
                    "direct_url": post.url,
                    "title": post.title or "Instagram Photo",
                    "thumbnail": post.url,
                    "ext": "jpg",
                    "filesize": None,
                    "kind": "image",
                    "downloads": {
                        "image": post.url,
                    },
                    "author_username": post.owner_username,
                    "author_display_name": post.owner_username,
                    "like_count": post.likes,
                    "comment_count": post.comments,
                    "width": post.width,
                    "height": post.height,
                }

            return None

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _extract)

    async def _resolve_instagram_fallbacks(self, url: str) -> Optional[Dict[str, Any]]:
        # Reuse PublicPlatformDownloader fallbacks for Instagram photos.
        try:
            ig = await self.public_downloader._fallback_instagram_json(url)  # type: ignore[attr-defined]
            if ig:
                return ig
            html = await self.public_downloader._fallback_instagram_html(url)  # type: ignore[attr-defined]
            if html:
                return html
            oembed = await self.public_downloader._fallback_instagram_oembed(url)  # type: ignore[attr-defined]
            if oembed:
                return oembed
            og = await self.public_downloader._fallback_opengraph(url)  # type: ignore[attr-defined]
            if og:
                return og
        except Exception:
            return None
        return None

    async def _resolve_instagram_story(self, url: str, user_auth: Optional[UserAuth]) -> Optional[Dict[str, Any]]:
        # Try instagrapi first if available and auth provided.
        if _HAS_INSTAGRAPI and user_auth and user_auth.username and user_auth.password:
            def _igapi() -> Optional[Dict[str, Any]]:
                try:
                    client = InstaClient()
                    client.login(user_auth.username, user_auth.password)
                    story_id = self._extract_instagram_story_id(url)
                    if not story_id:
                        return None
                    media = client.story_info(story_id)
                    if not media:
                        return None
                    if media.media_type == 2 and media.video_url:
                        return {
                            "direct_url": media.video_url,
                            "title": "Instagram Story",
                            "thumbnail": media.thumbnail_url,
                            "ext": "mp4",
                            "filesize": None,
                            "kind": "video",
                            "downloads": {
                                "videoHD": media.video_url,
                                "videoSD": media.video_url,
                                "image": media.thumbnail_url,
                            },
                            "author_username": media.user.username if media.user else None,
                            "author_display_name": media.user.full_name if media.user else None,
                        }
                    if media.thumbnail_url:
                        return {
                            "direct_url": media.thumbnail_url,
                            "title": "Instagram Story",
                            "thumbnail": media.thumbnail_url,
                            "ext": "jpg",
                            "filesize": None,
                            "kind": "image",
                            "downloads": {
                                "image": media.thumbnail_url,
                            },
                            "author_username": media.user.username if media.user else None,
                            "author_display_name": media.user.full_name if media.user else None,
                        }
                except Exception:
                    return None
                return None

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, _igapi)
            if result:
                return result

        # Fallback to instaloader (requires login for most stories).
        if not _HAS_INSTALOADER:
            return None

        def _instaloader_story() -> Optional[Dict[str, Any]]:
            loader = instaloader.Instaloader(
                download_videos=False,
                download_video_thumbnails=False,
                save_metadata=False,
                compress_json=False,
                quiet=True,
            )

            creds = self._pick_instagram_credentials(user_auth)
            if creds:
                try:
                    loader.login(creds["username"], creds["password"])
                except Exception:
                    return None
            else:
                return None

            username = self._extract_instagram_story_username(url)
            story_id = self._extract_instagram_story_id(url)
            if not username or not story_id:
                return None

            try:
                profile = instaloader.Profile.from_username(loader.context, username)
                stories = loader.get_stories(userids=[profile.userid])
                for story in stories:
                    for item in story.get_items():
                        if str(item.mediaid) == str(story_id):
                            if item.is_video and item.video_url:
                                return {
                                    "direct_url": item.video_url,
                                    "title": "Instagram Story",
                                    "thumbnail": item.url,
                                    "ext": "mp4",
                                    "filesize": None,
                                    "kind": "video",
                                    "downloads": {
                                        "videoHD": item.video_url,
                                        "videoSD": item.video_url,
                                        "image": item.url,
                                    },
                                    "author_username": username,
                                    "author_display_name": username,
                                }
                            if item.url:
                                return {
                                    "direct_url": item.url,
                                    "title": "Instagram Story",
                                    "thumbnail": item.url,
                                    "ext": "jpg",
                                    "filesize": None,
                                    "kind": "image",
                                    "downloads": {
                                        "image": item.url,
                                    },
                                    "author_username": username,
                                    "author_display_name": username,
                                }
            except Exception:
                return None
            return None

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _instaloader_story)

    async def _resolve_tiktok(
        self,
        url: str,
        quality: Quality,
        extract_audio: bool,
        media_type: Optional[MediaType],
    ) -> Dict[str, Any]:
        if media_type in (MediaType.PHOTO, MediaType.IMAGE, MediaType.ALBUM, MediaType.CAROUSEL):
            scraped = await self._resolve_tiktok_photos(url)
            if scraped:
                return scraped
        return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)

    async def _resolve_tiktok_photos(self, url: str) -> Optional[Dict[str, Any]]:
        if not _HAS_TIKTOK_SCRAPER:
            return None

        def _scrape() -> Optional[Dict[str, Any]]:
            try:
                scraper = TikTokScraper()
                data = scraper.get_data(url)
            except Exception:
                return None

            if not isinstance(data, dict):
                return None

            images = data.get("images") or data.get("image_urls") or []
            if not images:
                return None

            primary = images[0]
            return {
                "direct_url": primary,
                "title": data.get("title") or "TikTok Photo",
                "thumbnail": primary,
                "ext": "jpg",
                "filesize": None,
                "kind": "album" if len(images) > 1 else "image",
                "downloads": {
                    "image": primary,
                    "images": [{"url": img} for img in images],
                },
                "author_username": data.get("author"),
                "author_display_name": data.get("author"),
            }

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _scrape)

    async def _resolve_pinterest(self, url: str) -> Dict[str, Any]:
        if _HAS_SMD and sm_download:
            def _smd() -> Optional[Dict[str, Any]]:
                try:
                    result = sm_download(url)
                except Exception:
                    return None
                if not isinstance(result, dict):
                    return None
                image_url = result.get("url") or result.get("image") or result.get("download_url")
                if not image_url:
                    return None
                title = result.get("title") or "Pinterest Image"
                return {
                    "direct_url": image_url,
                    "title": title,
                    "thumbnail": image_url,
                    "ext": "jpg",
                    "filesize": None,
                    "kind": "image",
                    "downloads": {
                        "image": image_url,
                    },
                }

            loop = asyncio.get_event_loop()
            smd_result = await loop.run_in_executor(None, _smd)
            if smd_result:
                return smd_result

        # Fallback: OpenGraph extraction
        og = await self._resolve_opengraph_image(url)
        if og:
            return og

        return await self.public_downloader.resolve_media(url, Quality.HIGH, extract_audio=False)

    async def _resolve_opengraph_image(self, url: str) -> Optional[Dict[str, Any]]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers) as client:
                resp = await client.get(url)
        except Exception:
            return None

        if resp.status_code >= 400:
            return None

        html = resp.text
        match = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html, re.IGNORECASE)
        if not match:
            return None

        image_url = match.group(1)
        return {
            "direct_url": image_url,
            "title": "Pinterest Image",
            "thumbnail": image_url,
            "ext": "jpg",
            "filesize": None,
            "kind": "image",
            "downloads": {
                "image": image_url,
            },
        }

    def _extract_instagram_shortcode(self, url: str) -> Optional[str]:
        match = re.search(r"instagram\.com/(p|reel|tv)/([^/?#]+)", url)
        return match.group(2) if match else None

    def _extract_instagram_story_username(self, url: str) -> Optional[str]:
        match = re.search(r"instagram\.com/stories/([^/]+)/", url)
        return match.group(1) if match else None

    def _extract_instagram_story_id(self, url: str) -> Optional[str]:
        match = re.search(r"instagram\.com/stories/[^/]+/(\d+)", url)
        return match.group(1) if match else None

    def _pick_instagram_credentials(self, user_auth: Optional[UserAuth]) -> Optional[Dict[str, str]]:
        if user_auth and user_auth.username and user_auth.password:
            return {"username": user_auth.username, "password": user_auth.password}
        if settings.INSTAGRAM_USERNAME and settings.INSTAGRAM_PASSWORD:
            return {"username": settings.INSTAGRAM_USERNAME, "password": settings.INSTAGRAM_PASSWORD}
        return None
