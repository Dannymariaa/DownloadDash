import asyncio
import html as html_lib
import json
import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx

from app.config import settings
from app.api.resolver_errors import TERMINAL_PROVIDER_ERRORS, classify_resolver_error
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

    def _httpx_client_kwargs(self, **kwargs: Any) -> Dict[str, Any]:
        return kwargs

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
        if platform == Platform.FACEBOOK:
            return await self._resolve_facebook(url, quality, extract_audio)
        if platform in (Platform.TWITTER, Platform.X):
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)
        if platform in (Platform.REDDIT, Platform.YOUTUBE):
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

        # Posts: prefer resolvers that can prove the actual media type before
        # accepting thumbnail/open-graph image fallbacks.
        post = await self._resolve_instagram_post(url, user_auth)
        if post:
            return post

        # The public resolver already owns the JSON/HTML fallback sequence.
        # Repeating it here loses the original restriction and spends the
        # metadata deadline on identical requests. Gallery fallback is managed
        # once by the shared route after this resolver returns.
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
                request_timeout=5,
                max_connection_attempts=1,
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
                items = []
                for index, node in enumerate(post.get_sidecar_nodes() or []):
                    if node.is_video and node.video_url:
                        items.append({
                            "id": f"media-{index}",
                            "index": index,
                            "url": node.video_url,
                            "downloadableUrl": node.video_url,
                            "type": "video",
                            "width": getattr(node, 'video_url_width', None),
                            "height": getattr(node, 'video_url_height', None),
                            "thumbnail": node.display_url,
                            "thumbnailUrl": node.display_url,
                            "extension": "mp4",
                            "mimeType": "video/mp4",
                            "filename": f"{shortcode}-{index + 1}.mp4",
                        })
                    elif node.display_url:
                        items.append({
                            "id": f"media-{index}",
                            "index": index,
                            "url": node.display_url,
                            "downloadableUrl": node.display_url,
                            "type": "image",
                            "width": getattr(node, 'display_url_width', None),
                            "height": getattr(node, 'display_url_height', None),
                            "thumbnail": node.display_url,
                            "thumbnailUrl": node.display_url,
                            "extension": "jpg",
                            "mimeType": "image/jpeg",
                            "filename": f"{shortcode}-{index + 1}.jpg",
                        })

                primary = items[0]["url"] if items else post.url
                first_video = next((item for item in items if item.get("type") == "video"), None)
                first_image = next((item for item in items if item.get("type") == "image"), None)
                return {
                    "direct_url": primary,
                    "title": post.title or "Instagram Post",
                    "thumbnail": (first_image or items[0]).get("thumbnail") if items else primary,
                    "ext": (items[0].get("extension") if items else "jpg"),
                    "filesize": None,
                    "kind": "album" if len(items) > 1 else "image",
                    "downloads": {
                        "image": first_image["url"] if first_image else primary,
                        **({"videoHD": first_video["url"], "videoSD": first_video["url"]} if first_video else {}),
                        "images": items,
                        "items": items,
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
                        "thumbnailUrl": post.url,
                        "downloadableUrl": post.video_url,
                        "ext": "mp4",
                        "filesize": None,
                        "kind": "video",
                        "downloads": {
                            "videoHD": post.video_url,
                            "videoSD": post.video_url,
                            "items": [{
                                "id": "media-0",
                                "index": 0,
                                "type": "video",
                                "url": post.video_url,
                                "downloadableUrl": post.video_url,
                                "thumbnail": post.url,
                                "thumbnailUrl": post.url,
                                "extension": "mp4",
                                "mimeType": "video/mp4",
                            }],
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
                    "thumbnailUrl": post.url,
                    "downloadableUrl": post.url,
                    "ext": "jpg",
                    "filesize": None,
                    "kind": "image",
                    "downloads": {
                        "image": post.url,
                        "items": [{
                            "id": "media-0",
                            "index": 0,
                            "type": "image",
                            "url": post.url,
                            "downloadableUrl": post.url,
                            "thumbnail": post.url,
                            "thumbnailUrl": post.url,
                            "extension": "jpg",
                            "mimeType": "image/jpeg",
                            "width": post.width,
                            "height": post.height,
                        }],
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
                                "items": [{
                                    "id": "media-0",
                                    "index": 0,
                                    "type": "video",
                                    "url": media.video_url,
                                    "downloadableUrl": media.video_url,
                                    "thumbnail": media.thumbnail_url,
                                    "thumbnailUrl": media.thumbnail_url,
                                    "extension": "mp4",
                                    "mimeType": "video/mp4",
                                }],
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
                                "items": [{
                                    "id": "media-0",
                                    "index": 0,
                                    "type": "image",
                                    "url": media.thumbnail_url,
                                    "downloadableUrl": media.thumbnail_url,
                                    "thumbnail": media.thumbnail_url,
                                    "thumbnailUrl": media.thumbnail_url,
                                    "extension": "jpg",
                                    "mimeType": "image/jpeg",
                                }],
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
                                        "items": [{
                                            "id": "media-0",
                                            "index": 0,
                                            "type": "video",
                                            "url": item.video_url,
                                            "downloadableUrl": item.video_url,
                                            "thumbnail": item.url,
                                            "thumbnailUrl": item.url,
                                            "extension": "mp4",
                                            "mimeType": "video/mp4",
                                        }],
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
                                        "items": [{
                                            "id": "media-0",
                                            "index": 0,
                                            "type": "image",
                                            "url": item.url,
                                            "downloadableUrl": item.url,
                                            "thumbnail": item.url,
                                            "thumbnailUrl": item.url,
                                            "extension": "jpg",
                                            "mimeType": "image/jpeg",
                                        }],
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
        url_lower = url.lower()
        looks_like_photo_post = "/photo/" in url_lower or re.search(r"/@[^/]+/photo/", url_lower)
        if looks_like_photo_post or media_type in (MediaType.PHOTO, MediaType.IMAGE, MediaType.ALBUM, MediaType.CAROUSEL):
            scraped = await self._resolve_tiktok_photos(url)
            if scraped:
                return scraped
        return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)

    async def _resolve_tiktok_photos(self, url: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=6, follow_redirects=False, trust_env=False) as client:
            # TikTok publishes imagePost hydration on the canonical /video/ page too.
            # The /photo/ shell often contains only SEO metadata.
            response = await client.get(url.replace('/photo/', '/video/'), headers=self.public_downloader._build_http_headers(url))
        if response.status_code == 200:
            media_id = re.search(r'/(?:photo|video)/(\d+)', url)
            result = self._tiktok_photo_payload(response.text, media_id.group(1) if media_id else '')
            if result:
                return result
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
            audio_url = (
                data.get("music_url")
                or data.get("audio_url")
                or data.get("sound_url")
                or (data.get("music") or {}).get("play_url")
                or (data.get("music") or {}).get("url")
                or (data.get("audio") or {}).get("url")
            )
            image_items = [
                {
                    "id": f"media-{index}",
                    "index": index,
                    "url": img,
                    "downloadableUrl": img,
                    "type": "image",
                    "thumbnail": img,
                    "thumbnailUrl": img,
                    "extension": "jpg",
                    "mimeType": "image/jpeg",
                }
                for index, img in enumerate(images)
            ]
            items = list(image_items)
            if audio_url:
                items.append({
                    "id": f"media-{len(items)}",
                    "index": len(items),
                    "url": audio_url,
                    "downloadableUrl": audio_url,
                    "type": "audio",
                    "extension": "m4a",
                    "mimeType": "audio/mp4",
                })
            downloads = {
                "image": primary,
                "images": image_items,
                "items": items,
            }
            if audio_url:
                downloads["audio"] = audio_url
            return {
                "direct_url": primary,
                "title": data.get("title") or "TikTok Photo",
                "thumbnail": primary,
                "ext": "jpg",
                "filesize": None,
                "kind": "album" if len(images) > 1 else "image",
                "downloads": downloads,
                "author_username": data.get("author"),
                "author_display_name": data.get("author"),
            }

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _scrape)

    def _tiktok_photo_payload(self, html: str, media_id: str):
        def find_item(value):
            if isinstance(value, dict):
                if value.get('imagePost') and (not media_id or str(value.get('id')) == media_id):
                    return value
                for child in value.values():
                    found = find_item(child)
                    if found:
                        return found
            elif isinstance(value, list):
                for child in value:
                    found = find_item(child)
                    if found:
                        return found
            return None

        for script in re.findall(r'<script\b[^>]*>(.*?)</script>', html, re.S | re.I):
            try:
                item = find_item(json.loads(script))
            except (ValueError, RecursionError):
                continue
            if not item:
                continue
            images = []
            seen = set()
            for source in item['imagePost'].get('images', []):
                urls = (source.get('imageURL') or {}).get('urlList') or []
                asset = next((u for u in urls if isinstance(u, str) and u.startswith('https://')), None)
                if not asset or asset in seen:
                    continue
                seen.add(asset)
                ext = urlparse(asset).path.rsplit('.', 1)[-1].lower()
                images.append({'id': f'media-{len(images)}', 'index': len(images), 'type': 'image',
                               'url': asset, 'width': source.get('imageWidth'), 'height': source.get('imageHeight'),
                               **({'extension': ext} if ext in {'jpg', 'jpeg', 'png', 'webp', 'avif'} else {})})
            if not images:
                continue
            items = list(images)
            downloads = {'image': images[0]['url'], 'images': images, 'items': items}
            audio = (item.get('music') or {}).get('playUrl')
            if isinstance(audio, str) and audio.startswith('https://'):
                downloads['audio'] = audio
                items.append({'id': f'media-{len(items)}', 'index': len(items), 'type': 'audio', 'url': audio})
            return {'direct_url': images[0]['url'], 'title': item.get('desc') or 'TikTok Photos',
                    'thumbnail': images[0]['url'], 'kind': 'album' if len(images) > 1 else 'image',
                    'ext': images[0].get('extension'), 'downloads': downloads}
        return None

    async def _resolve_pinterest(self, url: str) -> Dict[str, Any]:
        try:
            # Metadata only: do not invoke downloader helpers that may transfer
            # a full Pin before the user selects a file.
            return await self.public_downloader.resolve_media(url, Quality.HIGH, extract_audio=False)
        except Exception:
            og = await self._resolve_opengraph_image(url)
            if og:
                return og
            raise

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
            async with httpx.AsyncClient(
                **self._httpx_client_kwargs(
                    timeout=5.0,
                    follow_redirects=True,
                    headers=headers,
                )
            ) as client:
                resp = await client.get(url)
        except Exception:
            return None

        if resp.status_code >= 400:
            return None

        html = resp.text
        match = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', html, re.IGNORECASE)
        if not match:
            return None

        image_url = html_lib.unescape(match.group(1))
        parsed_image = urlparse(image_url)
        if parsed_image.hostname not in {"i.pinimg.com", "i.pinimg.com.cn"} or "/originals/" not in parsed_image.path.lower():
            return None
        extension = parsed_image.path.rsplit(".", 1)[-1].lower() if "." in parsed_image.path else ""
        mime_by_extension = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "webp": "image/webp", "gif": "image/gif", "avif": "image/avif",
        }
        if extension not in mime_by_extension:
            return None
        return {
            "direct_url": image_url,
            "title": "Pinterest Image",
            "thumbnail": image_url,
            "ext": extension,
            "filesize": None,
            "kind": "image",
            "downloads": {
                "image": image_url,
                "items": [{
                    "id": "media-0", "index": 0, "type": "image", "url": image_url,
                    "extension": extension, "mimeType": mime_by_extension[extension],
                }],
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

    async def _resolve_facebook(self, url: str, quality: Quality, extract_audio: bool) -> Dict[str, Any]:
        try:
            return await self.public_downloader.resolve_media(url, quality, extract_audio=extract_audio)
        except Exception as primary_error:
            if classify_resolver_error(Platform.FACEBOOK, str(primary_error)) in TERMINAL_PROVIDER_ERRORS:
                raise
            fallback_urls = self.public_downloader.facebook_fallback_urls(url)  # type: ignore[attr-defined]
            html_diagnostics = []

            async def resolve_facebook_fallback(fallback_url: str):
                try:
                    return await asyncio.wait_for(
                        self.public_downloader._fallback_opengraph(fallback_url),  # type: ignore[attr-defined]
                        timeout=4.0,
                    )
                except Exception:
                    return None

            # Mobile/basic variants are independent page requests. Trying them
            # serially let three stalled responses consume the entire request budget.
            fallbacks = await asyncio.gather(
                *(resolve_facebook_fallback(candidate) for candidate in fallback_urls[:3])
            )
            for fallback in fallbacks:
                if fallback and fallback.get("direct_url"):
                    warnings = fallback.setdefault("warnings", [])
                    warnings.append(
                        "Resolved Facebook media with HTML fallback. Stories require fresh Facebook cookies when private, expired, or login-gated."
                    )
                    return fallback

            try:
                html_diagnostics.append(
                    await asyncio.wait_for(
                        self.public_downloader._facebook_html_diagnostic(url),  # type: ignore[attr-defined]
                        timeout=2.5,
                    )
                )
            except asyncio.TimeoutError:
                html_diagnostics.append("Facebook HTML diagnostic timed out")
            except Exception as diagnostic_error:
                html_diagnostics.append(f"Facebook HTML diagnostic unavailable: {type(diagnostic_error).__name__}")

            cookie_names = self.public_downloader._cookie_names_for_url(url)  # type: ignore[attr-defined]
            cookie_hint = (
                f"facebook_cookie_count={len(cookie_names)}"
                if cookie_names
                else "facebook_cookie_count=0"
            )
            diagnostic_hint = " | ".join(dict.fromkeys(html_diagnostics[-3:]))
            raise Exception(
                f"{primary_error}. {cookie_hint}. {diagnostic_hint}. "
                "If Facebook returns login/challenge HTML for a public URL from Render, "
                "configure fresh Netscape-format SMD_YTDLP_COOKIE_DATA_FACEBOOK cookies "
                "from a legitimate server-side session that can view that public media."
            )
