import yt_dlp
import asyncio
from typing import Dict, Any, Optional
import os
import uuid
import re
import httpx
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from ..models.schemas import Platform, Quality

class PublicPlatformDownloader:
    """Handles downloads from public social media platforms using yt-dlp"""
    
    def __init__(self, download_path: str = "./downloads", cookiefile: str | None = None):
        self.download_path = download_path
        self.cookiefile = cookiefile
        self.user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )

    def _build_http_headers(self, url: str) -> Dict[str, str]:
        try:
            from urllib.parse import urlparse

            parsed = urlparse(url)
            origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else None
        except Exception:
            origin = None

        headers: Dict[str, str] = {
            "User-Agent": self.user_agent,
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Connection": "keep-alive",
        }
        if origin:
            headers["Origin"] = origin
            headers["Referer"] = origin + "/"
        return headers
    
    def get_ydl_opts(self, quality: Quality, output_template: str) -> Dict[str, Any]:
        """Get yt-dlp options based on quality"""
        height_map = {
            Quality.P144: 144,
            Quality.P240: 240,
            Quality.P360: 360,
            Quality.P480: 480,
            Quality.P720: 720,
            Quality.P1080: 1080,
            Quality.P1440: 1440,
            Quality.P2160: 2160,
            Quality.P4320: 4320,
        }

        if quality == Quality.LOWEST:
            format_spec = "worst"
        elif quality == Quality.LOW:
            format_spec = "best[height<=360]"
        elif quality == Quality.MEDIUM:
            format_spec = "best[height<=720]"
        elif quality == Quality.HIGH:
            format_spec = "best[height<=1080]"
        elif quality == Quality.HIGHEST:
            format_spec = "best"
        elif quality == Quality.AUDIO_ONLY:
            format_spec = "bestaudio/best"
        elif quality == Quality.VIDEO_ONLY:
            format_spec = "bestvideo/best"
        elif quality in height_map:
            format_spec = f"best[height<={height_map[quality]}]"
        else:
            format_spec = "best[height<=1080]"
        
        opts = {
            'format': format_spec,
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'noplaylist': True,
            'restrictfilenames': True,
            'geo_bypass': True,
            'retries': 3,
            'fragment_retries': 3,
            'extractor_retries': 3,
            'socket_timeout': 20,
            'nocheckcertificate': True,
            'user_agent': self.user_agent,
        }

        if self.cookiefile and os.path.exists(self.cookiefile):
            opts["cookiefile"] = self.cookiefile

        return opts

    def _normalize_youtube_url(self, url: str) -> str:
        if "youtube.com" not in url and "youtu.be" not in url:
            return url

        parsed = urlparse(url)

        if "youtu.be" in parsed.netloc:
            video_id = parsed.path.lstrip("/").split("/")[0]
            if not video_id:
                return url
            query = parse_qs(parsed.query)
            cleaned_query = {}
            if query.get("t"):
                cleaned_query["t"] = query["t"][-1]
            return urlunparse(
                (
                    parsed.scheme or "https",
                    "www.youtube.com",
                    "/watch",
                    "",
                    urlencode({"v": video_id, **cleaned_query}),
                    "",
                )
            )

        query = parse_qs(parsed.query)
        if query.get("v"):
            cleaned_query = {"v": query["v"][-1]}
            if query.get("t"):
                cleaned_query["t"] = query["t"][-1]
            return urlunparse(
                (
                    parsed.scheme,
                    parsed.netloc,
                    parsed.path,
                    "",
                    urlencode(cleaned_query),
                    "",
                )
            )

        return url
    
    async def get_media_info(self, url: str) -> Dict[str, Any]:
        """Extract media information without downloading"""
        loop = asyncio.get_event_loop()
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }
        
        def extract_info():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        
        try:
            info = await loop.run_in_executor(None, extract_info)
            return {
                'title': info.get('title', 'Untitled'),
                'uploader': info.get('uploader', 'Unknown'),
                'duration': info.get('duration'),
                'thumbnail': info.get('thumbnail'),
                'formats': [
                    {
                        'format_id': f.get('format_id'),
                        'ext': f.get('ext'),
                        'height': f.get('height'),
                        'filesize': f.get('filesize'),
                    }
                    for f in info.get('formats', [])
                    if f.get('height') or f.get('vcodec') != 'none'
                ]
            }
        except Exception as e:
            raise Exception(f"Failed to extract info: {str(e)}")
    
    async def resolve_media(self, url: str, quality: Quality, extract_audio: bool = False) -> Dict[str, Any]:
        """Resolve a direct media URL without downloading or saving files."""
        loop = asyncio.get_event_loop()
        url = self._normalize_youtube_url(url)

        # Instagram photo posts often fail with yt-dlp "No video formats found".
        # Try Instagram-specific fallbacks first for non-audio requests.
        if ("instagram.com/" in url) and not extract_audio:
            ig = await self._fallback_instagram_json(url)
            if ig:
                return ig
            html = await self._fallback_instagram_html(url)
            if html:
                return html
            oembed = await self._fallback_instagram_oembed(url)
            if oembed:
                return oembed
            og = await self._fallback_opengraph(url)
            if og:
                return og

        # For best compatibility, prefer formats that include both audio+video when not extracting audio.
        file_id = str(uuid.uuid4())
        output_template = os.path.join(self.download_path, f"{file_id}.%(ext)s")
        ydl_opts = self.get_ydl_opts(quality, output_template)
        ydl_opts["extract_flat"] = False
        ydl_opts["noplaylist"] = True
        ydl_opts["http_headers"] = self._build_http_headers(url)

        # We only need metadata and the list of available formats here.
        # Let yt-dlp expose everything first, then we choose the best URL ourselves.
        extract_opts = dict(ydl_opts)
        extract_opts.pop("format", None)

        def extract_info(opts):
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, download=False)

        def _strip_ansi(text: str) -> str:
            return re.sub(r"\x1b\[[0-9;]*m", "", text or "")

        try:
            info = await loop.run_in_executor(None, lambda: extract_info(extract_opts))
        except Exception as e:
            msg = _strip_ansi(str(e))
            lowered = msg.lower()
            retried_successfully = False
            if "requested format is not available" in lowered:
                relaxed_opts = dict(extract_opts)
                relaxed_opts["format"] = "bestvideo*+bestaudio/best"
                try:
                    info = await loop.run_in_executor(None, lambda: extract_info(relaxed_opts))
                except Exception:
                    info = None
                if info is None and not extract_audio:
                    relaxed_opts["format"] = "best"
                    try:
                        info = await loop.run_in_executor(None, lambda: extract_info(relaxed_opts))
                    except Exception:
                        info = None
                if info is not None:
                    retried_successfully = True
                    msg = ""
                    lowered = ""
            if retried_successfully:
                pass
            elif (
                ("youtube.com" in url or "youtu.be" in url)
                and ("sign in to confirm you're not a bot" in lowered or "use --cookies-from-browser or --cookies" in lowered)
            ):
                raise Exception(
                    "YouTube is temporarily blocking downloads from the API server. "
                    "Please try again in a bit. If this keeps happening, the API needs fresh YouTube cookies configured on the backend."
                )
            elif "403" in lowered and "forbidden" in lowered:
                raise Exception(
                    "403 Forbidden from the platform. "
                    "TikTok/Instagram often block server IPs or require cookies/login. "
                    "Fix: export your browser cookies (Netscape format) and set SMD_YTDLP_COOKIEFILE to that file path, "
                    "or run the API from a different network/VPN."
                )
            elif "varnish" in lowered or "error 54113" in lowered:
                raise Exception(
                    "Blocked by an upstream cache (Varnish / Error 54113). "
                    "This is usually an IP/rate-limit block. Try a different network/VPN, or configure cookies via SMD_YTDLP_COOKIEFILE."
                )
            # Retry with relaxed format selection for image-only posts.
            elif ("no video formats found" in lowered or "no formats found" in lowered) and not extract_audio:
                relaxed_opts = dict(ydl_opts)
                relaxed_opts["format"] = "best"
                try:
                    info = await loop.run_in_executor(None, lambda: extract_info(relaxed_opts))
                except Exception:
                    info = None
            elif not retried_successfully:
                raise Exception(f"Resolve failed: {msg}")

            if info is None and ("no video formats found" in lowered or "no formats found" in lowered) and not extract_audio:
                ig_oembed = await self._fallback_instagram_oembed(url)
                if ig_oembed:
                    return ig_oembed
                ig = await self._fallback_instagram_json(url)
                if ig:
                    return ig
                html = await self._fallback_instagram_html(url)
                if html:
                    return html
                og = await self._fallback_opengraph(url)
                if og:
                    return og
                raise Exception(msg)

        if not info:
            raise Exception("Resolve failed: no info returned")

        # Handle playlists gracefully (pick first entry).
        if isinstance(info, dict) and isinstance(info.get("entries"), list) and info["entries"]:
            info = info["entries"][0] or info

        formats = info.get("formats") or []
        thumbnail = info.get("thumbnail")
        title = info.get("title", "Untitled")

        def pick_best(predicate):
            candidates = [f for f in formats if f.get("url") and predicate(f)]
            if not candidates:
                return None
            candidates.sort(
                key=lambda f: (
                    (f.get("height") or 0),
                    (f.get("tbr") or 0),
                    (f.get("filesize") or f.get("filesize_approx") or 0),
                )
            )
            return candidates[-1]

        def pick_best_max_height(max_height: int):
            return pick_best(
                lambda f: (f.get("height") or 0) > 0
                and (f.get("height") or 0) <= max_height
                and f.get("vcodec") != "none"
                and f.get("acodec") != "none"
            )

        def pick_best_av():
            return pick_best(lambda f: f.get("vcodec") != "none" and f.get("acodec") != "none")

        def pick_best_video_only():
            return pick_best(lambda f: f.get("vcodec") != "none")

        def pick_best_audio():
            return pick_best(lambda f: f.get("vcodec") == "none" and f.get("acodec") != "none")

        def pick_best_image():
            return pick_best(
                lambda f: f.get("vcodec") == "none"
                and f.get("acodec") == "none"
                and (f.get("ext") in ("jpg", "jpeg", "png", "webp") or (f.get("height") or 0) == 0)
            )

        selected_image = pick_best_image()
        selected_audio = pick_best_audio()
        selected_hd = pick_best_av() or pick_best_video_only()
        selected_sd = pick_best_max_height(480) or pick_best_max_height(720)

        # Decide kind and primary direct_url.
        if extract_audio:
            primary = selected_audio
            kind = "audio"
        elif selected_image and not selected_hd:
            primary = selected_image
            kind = "image"
        else:
            primary = selected_hd
            kind = "video"

        downloads: Dict[str, str] = {}

        direct_url = primary.get("url") if primary else info.get("url")
        if not direct_url and thumbnail:
            # Some Instagram photo posts only expose thumbnails.
            direct_url = thumbnail
            kind = "image"
            if selected_image is None:
                downloads["image"] = thumbnail

        if not direct_url:
            raise Exception("Resolve failed: no direct URL found")

        if selected_hd and selected_hd.get("url"):
            downloads["videoHD"] = selected_hd["url"]
        if selected_sd and selected_sd.get("url"):
            downloads["videoSD"] = selected_sd["url"]
        elif selected_hd and selected_hd.get("url"):
            # Fallback: expose SD option even when only one video stream is available
            downloads["videoSD"] = selected_hd["url"]
        if selected_audio and selected_audio.get("url"):
            downloads["audio"] = selected_audio["url"]
        if selected_image and selected_image.get("url"):
            downloads["image"] = selected_image["url"]
        elif thumbnail:
            downloads["image"] = thumbnail

        # Ensure image downloads are available when the primary is an image.
        if kind == "image" and not downloads.get("image"):
            downloads["image"] = direct_url

        return {
            "direct_url": direct_url,
            "title": title,
            "thumbnail": thumbnail,
            "ext": primary.get("ext") if primary else info.get("ext"),
            "filesize": (primary.get("filesize") or primary.get("filesize_approx")) if primary else info.get("filesize") or info.get("filesize_approx"),
            "kind": kind,
            "downloads": downloads,
        }

    async def _fallback_opengraph(self, url: str) -> Optional[Dict[str, Any]]:
        headers = self._build_http_headers(url)
        cookies = self._load_cookiefile()
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers, cookies=cookies) as client:
                resp = await client.get(url)
                if resp.status_code >= 400:
                    return None
                html = resp.text
        except Exception:
            return None

        def _find_meta(prop: str) -> Optional[str]:
            pattern = rf'<meta[^>]+property="{re.escape(prop)}"[^>]+content="([^"]+)"'
            match = re.search(pattern, html, re.IGNORECASE)
            return match.group(1) if match else None

        og_image = _find_meta("og:image")
        og_video = _find_meta("og:video")
        og_title = _find_meta("og:title") or "Untitled"

        if og_video:
            return {
                "direct_url": og_video,
                "title": og_title,
                "thumbnail": og_image,
                "ext": "mp4",
                "filesize": None,
                "kind": "video",
                "downloads": {
                    "videoHD": og_video,
                    "videoSD": og_video,
                    "image": og_image,
                },
            }

        if og_image:
            return {
                "direct_url": og_image,
                "title": og_title,
                "thumbnail": og_image,
                "ext": "jpg",
                "filesize": None,
                "kind": "image",
                "downloads": {
                    "image": og_image,
                },
            }

        return None

    async def _fallback_instagram_json(self, url: str) -> Optional[Dict[str, Any]]:
        # Try Instagram internal JSON endpoint (requires cookies for many posts).
        shortcode = self._extract_instagram_shortcode(url)
        if not shortcode:
            return None

        headers = self._build_http_headers(url)
        headers.update({
            "Accept": "application/json, text/plain, */*",
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
        })
        cookies = self._load_cookiefile()
        api_url = f"https://www.instagram.com/p/{shortcode}/?__a=1&__d=dis"

        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers, cookies=cookies) as client:
                resp = await client.get(api_url)
                if resp.status_code >= 400:
                    return None
                data = resp.json()
        except Exception:
            return None

        media = (
            data.get("graphql", {}).get("shortcode_media")
            or data.get("items", [None])[0]
            or {}
        )

        if not media:
            return None

        is_video = bool(media.get("is_video"))
        title = media.get("title") or "Untitled"
        display_url = media.get("display_url")
        video_url = media.get("video_url")

        if is_video and video_url:
            return {
                "direct_url": video_url,
                "title": title,
                "thumbnail": display_url,
                "ext": "mp4",
                "filesize": None,
                "kind": "video",
                "downloads": {
                    "videoHD": video_url,
                    "videoSD": video_url,
                    "image": display_url,
                },
            }

        if display_url:
            return {
                "direct_url": display_url,
                "title": title,
                "thumbnail": display_url,
                "ext": "jpg",
                "filesize": None,
                "kind": "image",
                "downloads": {
                    "image": display_url,
                },
            }

        return None

    async def _fallback_instagram_html(self, url: str) -> Optional[Dict[str, Any]]:
        headers = self._build_http_headers(url)
        cookies = self._load_cookiefile()
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers, cookies=cookies) as client:
                resp = await client.get(url)
                if resp.status_code >= 400:
                    return None
                html = resp.text
        except Exception:
            return None

        # Try to extract display_url / video_url from embedded JSON.
        def _unescape(value: str) -> str:
            return (
                value.replace("\\u0026", "&")
                .replace("\\/", "/")
                .replace("\\u003d", "=")
            )

        video_match = re.search(r'"video_url":"([^"]+)"', html)
        image_match = re.search(r'"display_url":"([^"]+)"', html)
        is_video = bool(video_match)

        title_match = re.search(r'"title":"([^"]*)"', html)
        title = _unescape(title_match.group(1)) if title_match else "Untitled"

        if is_video and video_match:
            video_url = _unescape(video_match.group(1))
            image_url = _unescape(image_match.group(1)) if image_match else None
            return {
                "direct_url": video_url,
                "title": title,
                "thumbnail": image_url,
                "ext": "mp4",
                "filesize": None,
                "kind": "video",
                "downloads": {
                    "videoHD": video_url,
                    "videoSD": video_url,
                    "image": image_url,
                },
            }

        if image_match:
            image_url = _unescape(image_match.group(1))
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

        return None

    async def _fallback_instagram_oembed(self, url: str) -> Optional[Dict[str, Any]]:
        # Public oEmbed endpoint often returns a thumbnail for photo posts.
        headers = self._build_http_headers(url)
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=headers) as client:
                resp = await client.get("https://www.instagram.com/oembed/", params={"url": url})
                if resp.status_code >= 400:
                    return None
                data = resp.json()
        except Exception:
            return None

        thumb = data.get("thumbnail_url")
        title = data.get("title") or "Untitled"
        if thumb:
            return {
                "direct_url": thumb,
                "title": title,
                "thumbnail": thumb,
                "ext": "jpg",
                "filesize": None,
                "kind": "image",
                "downloads": {
                    "image": thumb,
                },
            }
        return None

    def _extract_instagram_shortcode(self, url: str) -> Optional[str]:
        match = re.search(r"instagram\.com/(p|reel|tv)/([^/?#]+)", url)
        return match.group(2) if match else None

    def _load_cookiefile(self) -> httpx.Cookies:
        jar = httpx.Cookies()
        if not self.cookiefile or not os.path.exists(self.cookiefile):
            return jar
        try:
            with open(self.cookiefile, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        # Handle HttpOnly cookies in Netscape format: "#HttpOnly_.domain"
                        if line.startswith("#HttpOnly_"):
                            line = line.replace("#HttpOnly_", "", 1)
                        else:
                            continue
                    parts = line.split("\t")
                    if len(parts) < 7:
                        continue
                    domain, _flag, path, _secure, _expires, name, value = parts[:7]
                    # Unquote and unescape common Netscape escapes
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    value = value.replace("\\054", ",").replace("\\n", "\n").replace("\\t", "\t")

                    # Keep leading dot for subdomain matching (httpx handles this)
                    domain = domain.strip()
                    if not domain:
                        continue
                    jar.set(name, value, domain=domain.lstrip(".") if domain.startswith(".") else domain, path=path or "/")
        except Exception:
            return jar
        return jar
    
    def get_supported_platforms(self) -> list:
        """Return list of platforms supported by yt-dlp"""
        return [
            Platform.INSTAGRAM,
            Platform.TIKTOK,
            Platform.FACEBOOK,
            Platform.REDDIT,
            Platform.PINTEREST,
            Platform.TWITTER,
            Platform.YOUTUBE,
        ]
