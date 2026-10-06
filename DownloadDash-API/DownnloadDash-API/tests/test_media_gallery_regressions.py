import asyncio
import io
import os
import unittest
from contextlib import redirect_stdout
from unittest.mock import AsyncMock, patch

from fastapi import BackgroundTasks

from app.api.shared import (
    _gallery_result_is_richer,
    _resolve_cache,
    _resolve_inflight,
    _timing_payload,
    _should_try_gallery_enrichment,
    download_public,
)
from app.api.download import _filename_for_fallback
from app.models.schemas import DownloadRequest, UserAuth
from app.models.schemas import MediaType, Platform, Quality
from app.models.platform_requests import RedditDownloadIn, YouTubeDownloadIn
from app.platforms.public_platforms import PublicPlatformDownloader
from app.platforms.universal_downloader import UniversalMediaDownloader


class FakeInstagramPost:
    typename = "GraphImage"
    is_video = True
    video_url = "https://cdn.example/video.mp4"
    url = "https://cdn.example/thumb.jpg"
    title = "Video post"
    owner_username = "creator"
    likes = 1
    comments = 2
    video_duration = 9


class FakeImageNode:
    is_video = False
    display_url = "https://cdn.example/01.jpg"
    display_url_width = 1080
    display_url_height = 1350


class FakeVideoNode:
    is_video = True
    video_url = "https://cdn.example/02.mp4"
    video_url_width = 1080
    video_url_height = 1920
    display_url = "https://cdn.example/02-thumb.jpg"


class FakeSidecarPost:
    typename = "GraphSidecar"
    title = "Mixed carousel"
    url = "https://cdn.example/cover.jpg"
    owner_username = "creator"
    likes = 1
    comments = 2

    def get_sidecar_nodes(self):
        return [FakeImageNode(), FakeVideoNode(), FakeImageNode()]


class MediaGalleryRegressionTests(unittest.TestCase):
    def test_youtube_profiles_cannot_proxy_file_transfers(self):
        downloader = PublicPlatformDownloader()
        downloader.youtube_proxy_url = "http://proxy.example:8080"

        profiles = downloader._youtube_client_profiles()

        self.assertEqual(len(profiles), 1)
        self.assertEqual(profiles[0][0], "public_default")
        self.assertIsNone(profiles[0][1])
        self.assertFalse(profiles[0][3])

    def test_platform_request_validation_accepts_reddit_share_and_youtube_live(self):
        self.assertEqual(
            str(RedditDownloadIn(url="https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3").url),
            "https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3",
        )
        self.assertEqual(
            str(YouTubeDownloadIn(url="https://youtube.com/live/abc123").url),
            "https://youtube.com/live/abc123",
        )

    def test_provider_request_validation_rejects_cross_platform_and_lookalike_hosts(self):
        from pydantic import ValidationError

        for model, url in (
            (RedditDownloadIn, "https://reddit.com.evil.example/r/test/comments/abc/title"),
            (YouTubeDownloadIn, "https://www.reddit.com/r/test/comments/abc/title"),
            (YouTubeDownloadIn, "https://name:password@youtube.com/watch?v=abc123"),
            (YouTubeDownloadIn, "https://youtube.com:8443/watch?v=abc123"),
            (YouTubeDownloadIn, "https://youtube.com/watch"),
        ):
            with self.assertRaises(ValidationError):
                model(url=url)
        with self.assertRaises(ValidationError):
            DownloadRequest(url="https://youtube.com.evil.example/watch?v=abc123")
        from app.models.platform_requests import TikTokDownloadIn
        with self.assertRaises(ValidationError):
            TikTokDownloadIn(url="https://www.tiktok.com/@creator/profile")

    def test_facebook_html_fallbacks_run_in_parallel_within_bounded_time(self):
        class FacebookStub:
            def __init__(self):
                self.active = 0
                self.max_active = 0

            async def resolve_media(self, *args, **kwargs):
                raise RuntimeError("facebook primary extractor failed")

            def facebook_fallback_urls(self, url):
                return [url, "https://m.facebook.com/reel/123", "https://mbasic.facebook.com/reel/123"]

            async def _fallback_opengraph(self, url):
                self.active += 1
                self.max_active = max(self.max_active, self.active)
                await asyncio.sleep(0.01)
                self.active -= 1
                if "m.facebook.com" in url:
                    return {"direct_url": "https://cdn.example/video.mp4", "downloads": {}, "warnings": []}
                return None

            async def _facebook_html_diagnostic(self, _url):
                return "html_kind=challenge"

            def _cookie_names_for_url(self, _url):
                return []

        public = FacebookStub()
        result = asyncio.run(UniversalMediaDownloader(public)._resolve_facebook(
            "https://www.facebook.com/reel/123", Quality.HIGHEST, False
        ))
        self.assertEqual(result["direct_url"], "https://cdn.example/video.mp4")
        self.assertGreater(public.max_active, 1)

    def test_x_hls_video_is_a_managed_mp4_download_not_a_playlist(self):
        downloader = PublicPlatformDownloader()
        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "X HLS sample",
                "url": "https://video.twimg.com/ext_tw_video/123/pu/pl/playlist.m3u8",
                "ext": "m3u8",
                "thumbnail": "https://pbs.twimg.com/thumb.jpg",
                "formats": [{
                    "url": "https://video.twimg.com/ext_tw_video/123/pu/pl/playlist.m3u8",
                    "ext": "m3u8",
                    "height": 720,
                    "vcodec": "h264",
                    "acodec": "aac",
                }],
            }
            result = asyncio.run(downloader.resolve_media("https://x.com/user/status/123", Quality.HIGH))

        item = result["downloads"]["items"][0]
        self.assertTrue(result["downloads"]["videoHD"].startswith("/download/file?"))
        self.assertTrue(result["downloads"]["videoHD"].endswith(".mp4"))
        self.assertNotIn(".m3u8", result["downloads"]["videoHD"])
        self.assertEqual(item["extension"], "mp4")
        self.assertEqual(item["mimeType"], "video/mp4")
        self.assertTrue(item["hasAudio"])

    def test_pinterest_hls_video_is_a_managed_mp4_download_not_a_playlist(self):
        downloader = PublicPlatformDownloader()
        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Pinterest HLS sample",
                "url": "https://v1.pinimg.com/videos/playlist.m3u8",
                "ext": "m3u8",
                "thumbnail": "https://i.pinimg.com/thumb.jpg",
                "formats": [{
                    "url": "https://v1.pinimg.com/videos/playlist.m3u8",
                    "ext": "m3u8",
                    "height": 720,
                    "vcodec": "h264",
                    "acodec": "aac",
                }],
            }
            result = asyncio.run(downloader.resolve_media("https://www.pinterest.com/pin/664281013778109217/", Quality.HIGH))

        item = result["downloads"]["items"][0]
        self.assertTrue(result["downloads"]["videoHD"].startswith("/download/file?"))
        self.assertTrue(result["downloads"]["videoHD"].endswith(".mp4"))
        self.assertNotIn(".m3u8", result["downloads"]["videoHD"])
        self.assertEqual(item["extension"], "mp4")
        self.assertEqual(item["mimeType"], "video/mp4")
        self.assertTrue(item["hasAudio"])

    def test_audio_extraction_uses_audio_track_url_and_actual_extension(self):
        downloader = PublicPlatformDownloader()
        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Audio sample",
                "url": "https://cdn.example/video.mp4",
                "ext": "mp4",
                "formats": [
                    {"url": "https://cdn.example/video.mp4", "ext": "mp4", "vcodec": "h264", "acodec": "aac", "height": 720},
                    {"url": "https://cdn.example/audio.mp3", "ext": "mp3", "vcodec": "none", "acodec": "mp3"},
                ],
            }
            result = asyncio.run(downloader.resolve_media(
                "https://www.instagram.com/reel/abc123/", Quality.HIGH, extract_audio=True
            ))

        item = result["downloads"]["items"][0]
        self.assertEqual(result["direct_url"], "https://cdn.example/audio.mp3")
        self.assertEqual(item["url"], "https://cdn.example/audio.mp3")
        self.assertEqual(item["extension"], "mp3")
        self.assertEqual(item["mimeType"], "audio/mpeg")

    def test_pinterest_resolution_is_metadata_only_and_preserves_video_media(self):
        class PinterestStub:
            async def resolve_media(self, url, quality, extract_audio=False):
                self.url = url
                self.quality = quality
                return {
                    "direct_url": "https://v.pinimg.com/video.mp4",
                    "kind": "video",
                    "ext": "mp4",
                    "downloads": {"videoHD": "https://v.pinimg.com/video.mp4"},
                }

        public = PinterestStub()
        result = asyncio.run(UniversalMediaDownloader(public)._resolve_pinterest(
            "https://www.pinterest.com/pin/123/"
        ))
        self.assertEqual(result["kind"], "video")
        self.assertEqual(public.quality, Quality.HIGH)
        self.assertEqual(public.url, "https://www.pinterest.com/pin/123/")

    def test_pinterest_opengraph_fallback_accepts_only_original_format_images(self):
        from types import SimpleNamespace

        downloader = UniversalMediaDownloader(PublicPlatformDownloader())

        class FakeClient:
            def __init__(self, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                return None

            async def get(self, url):
                image = (
                    "https://i.pinimg.com/originals/a/b/cat.png"
                    if url.endswith("/original/") else "https://i.pinimg.com/236x/a/b/cat.jpg"
                )
                return SimpleNamespace(
                    status_code=200,
                    text=f'<meta property="og:image" content="{image}">',
                )

        with patch("app.platforms.universal_downloader.httpx.AsyncClient", FakeClient):
            preview = asyncio.run(downloader._resolve_opengraph_image("https://www.pinterest.com/pin/preview/"))
            original = asyncio.run(downloader._resolve_opengraph_image("https://www.pinterest.com/pin/original/"))

        self.assertIsNone(preview)
        self.assertEqual(original["direct_url"], "https://i.pinimg.com/originals/a/b/cat.png")
        self.assertEqual(original["downloads"]["items"][0]["extension"], "png")

    def test_instagram_p_video_uses_video_url_not_thumbnail_as_media_item(self):
        downloader = UniversalMediaDownloader(PublicPlatformDownloader())

        with patch("app.platforms.universal_downloader._HAS_INSTALOADER", True), \
             patch("app.platforms.universal_downloader.instaloader") as instaloader_mock:
            instaloader_mock.Instaloader.return_value.context = object()
            instaloader_mock.Post.from_shortcode.return_value = FakeInstagramPost()

            result = asyncio.run(downloader._resolve_instagram_post("https://www.instagram.com/p/abc123/", None))

        self.assertEqual(result["kind"], "video")
        self.assertEqual(result["direct_url"], "https://cdn.example/video.mp4")
        self.assertEqual(result["thumbnail"], "https://cdn.example/thumb.jpg")
        self.assertEqual(result["downloads"]["items"][0]["type"], "video")
        self.assertEqual(result["downloads"]["items"][0]["url"], "https://cdn.example/video.mp4")
        self.assertNotEqual(result["downloads"]["items"][0]["url"], result["thumbnail"])
        self.assertNotIn("hasAudio", result["downloads"]["items"][0])

    def test_instagram_sidecar_preserves_every_item_in_order(self):
        downloader = UniversalMediaDownloader(PublicPlatformDownloader())

        with patch("app.platforms.universal_downloader._HAS_INSTALOADER", True), \
             patch("app.platforms.universal_downloader.instaloader") as instaloader_mock:
            instaloader_mock.Instaloader.return_value.context = object()
            instaloader_mock.Post.from_shortcode.return_value = FakeSidecarPost()

            result = asyncio.run(downloader._resolve_instagram_post("https://www.instagram.com/p/abc123/", None))

        items = result["downloads"]["items"]
        self.assertEqual(result["kind"], "album")
        self.assertEqual([item["type"] for item in items], ["image", "video", "image"])
        self.assertEqual([item["index"] for item in items], [0, 1, 2])
        self.assertEqual(items[1]["url"], "https://cdn.example/02.mp4")
        self.assertEqual(items[1]["thumbnail"], "https://cdn.example/02-thumb.jpg")
        self.assertNotIn("hasAudio", items[1])

    def test_tiktok_photo_audio_is_not_in_images_collection(self):
        downloader = UniversalMediaDownloader(PublicPlatformDownloader())

        with patch("app.platforms.universal_downloader._HAS_TIKTOK_SCRAPER", True), \
             patch("app.platforms.universal_downloader.TikTokScraper") as scraper_mock, \
             patch("app.platforms.universal_downloader.httpx.AsyncClient") as http_client:
            from types import SimpleNamespace
            http_client.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=SimpleNamespace(status_code=200, text=''))
            scraper_mock.return_value.get_data.return_value = {
                "images": ["https://cdn.example/1.jpg", "https://cdn.example/2.jpg"],
                "music_url": "https://cdn.example/song.m4a",
            }

            result = asyncio.run(downloader._resolve_tiktok_photos("https://www.tiktok.com/@u/photo/1"))

        self.assertEqual([item["type"] for item in result["downloads"]["images"]], ["image", "image"])
        self.assertEqual([item["type"] for item in result["downloads"]["items"]], ["image", "image", "audio"])
        self.assertEqual(result["downloads"]["audio"], "https://cdn.example/song.m4a")

    def test_tiktok_photo_url_invokes_photo_resolver_without_media_type_hint(self):
        class PublicStub:
            async def resolve_media(self, *args, **kwargs):
                raise AssertionError("video resolver should not be used for /photo/ URLs")

        downloader = UniversalMediaDownloader(PublicStub())

        async def fake_photos(url):
            return {"kind": "album", "downloads": {"items": [{"type": "image", "url": "https://cdn.example/1.jpg"}]}}

        downloader._resolve_tiktok_photos = fake_photos

        result = asyncio.run(
            downloader._resolve_tiktok(
                "https://www.tiktok.com/@creator/photo/123",
                Quality.HIGH,
                False,
                None,
            )
        )

        self.assertEqual(result["kind"], "album")

    def test_gallery_entries_do_not_use_webpage_url_or_thumbnail_as_media(self):
        downloader = PublicPlatformDownloader()

        entries = [
            {"webpage_url": "https://example.com/post/1", "thumbnail": "https://cdn.example/thumb.jpg"},
            {"url": "https://cdn.example/actual.jpg", "ext": "jpg", "width": 800, "height": 600},
        ]

        items = downloader._items_from_gallery_entries(entries)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["url"], "https://cdn.example/actual.jpg")
        self.assertEqual(items[0]["type"], "image")

    def test_gallery_video_format_variants_collapse_to_one_source_item(self):
        downloader = PublicPlatformDownloader()

        entries = [
            {
                "id": "post-video",
                "media_id": "post-video",
                "url": "https://cdn.example/video-1080.mp4",
                "ext": "mp4",
                "height": 1080,
                "width": 1920,
                "vcodec": "h264",
                "acodec": "aac",
            },
            {
                "id": "post-video",
                "media_id": "post-video",
                "url": "https://cdn.example/video-480.mp4",
                "ext": "mp4",
                "height": 480,
                "width": 854,
                "vcodec": "h264",
                "acodec": "aac",
            },
            {
                "id": "post-video-audio",
                "media_id": "post-video-audio",
                "url": "https://cdn.example/audio.m4a",
                "ext": "m4a",
                "acodec": "aac",
                "vcodec": "none",
            },
        ]

        items = downloader._items_from_gallery_entries(entries)

        self.assertEqual([item["type"] for item in items], ["video", "audio"])
        self.assertEqual(items[0]["url"], "https://cdn.example/video-1080.mp4")
        self.assertEqual([variant["height"] for variant in items[0]["variants"]], [1080, 480])

    def test_gallery_distinct_carousel_videos_remain_separate_source_items(self):
        downloader = PublicPlatformDownloader()

        entries = [
            {
                "id": "carousel-child-1",
                "media_id": "carousel-child-1",
                "url": "https://cdn.example/child-1.mp4",
                "ext": "mp4",
                "vcodec": "h264",
                "acodec": "aac",
            },
            {
                "id": "carousel-child-2",
                "media_id": "carousel-child-2",
                "url": "https://cdn.example/child-2.mp4",
                "ext": "mp4",
                "vcodec": "h264",
                "acodec": "aac",
            },
        ]

        items = downloader._items_from_gallery_entries(entries)

        self.assertEqual([item["url"] for item in items], ["https://cdn.example/child-1.mp4", "https://cdn.example/child-2.mp4"])
        self.assertEqual([item["index"] for item in items], [0, 1])

    def test_instagram_reel_does_not_fall_back_to_oembed_thumbnail(self):
        downloader = PublicPlatformDownloader()
        downloader._fallback_instagram_json = AsyncMock(return_value=None)
        downloader._fallback_instagram_html = AsyncMock(return_value=None)
        downloader._fallback_instagram_oembed = AsyncMock(return_value={
            "kind": "image",
            "downloads": {
                "items": [{
                    "type": "image",
                    "url": "https://cdn.example/reel-thumb.jpg",
                }],
            },
        })
        downloader._fallback_opengraph = AsyncMock(return_value={
            "kind": "image",
            "downloads": {
                "items": [{
                    "type": "image",
                    "url": "https://cdn.example/og-thumb.jpg",
                }],
            },
        })

        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.side_effect = Exception("No video formats found")

            with self.assertRaises(Exception):
                asyncio.run(downloader.resolve_media("https://www.instagram.com/reel/abc123/", Quality.HIGH))

        downloader._fallback_instagram_oembed.assert_not_awaited()
        downloader._fallback_opengraph.assert_not_awaited()

    def test_instagram_single_image_post_allows_gallery_enrichment(self):
        result = {
            "direct_url": "https://cdn.example/thumb.jpg",
            "kind": "image",
            "downloads": {
                "items": [{
                    "type": "image",
                    "url": "https://cdn.example/thumb.jpg",
                }],
            },
        }

        self.assertTrue(
            _should_try_gallery_enrichment(
                Platform.INSTAGRAM,
                "https://www.instagram.com/p/abc123/",
                result,
            )
        )

        richer_gallery = {
            "direct_url": "https://cdn.example/01.jpg",
            "kind": "image",
            "downloads": {
                "items": [
                    {"type": "image", "url": "https://cdn.example/01.jpg"},
                    {"type": "video", "url": "https://cdn.example/02.mp4"},
                ],
            },
        }

        self.assertTrue(_gallery_result_is_richer(result, richer_gallery))

    def test_instagram_single_photo_does_not_replace_with_equal_gallery_image(self):
        result = {
            "direct_url": "https://cdn.example/photo.jpg",
            "kind": "image",
            "downloads": {
                "items": [{
                    "type": "image",
                    "url": "https://cdn.example/photo.jpg",
                }],
            },
        }
        equal_gallery = {
            "direct_url": "https://cdn.example/photo.jpg",
            "kind": "image",
            "downloads": {
                "image": "https://cdn.example/photo.jpg",
            },
        }

        self.assertFalse(_gallery_result_is_richer(result, equal_gallery))

    def test_pinterest_video_item_does_not_populate_image_download(self):
        class UniversalStub:
            async def resolve_media(self, *args, **kwargs):
                return {
                    "direct_url": "https://v.pinimg.com/video.m3u8",
                    "title": "Pinterest video",
                    "thumbnail": "https://i.pinimg.com/thumb.jpg",
                    "ext": "mp4",
                    "kind": "video",
                    "downloads": {
                        "videoHD": "https://v.pinimg.com/video.m3u8",
                        "videoSD": "https://v.pinimg.com/video.m3u8",
                        "items": [{
                            "type": "video",
                            "url": "https://v.pinimg.com/video.m3u8",
                            "thumbnail": "https://i.pinimg.com/thumb.jpg",
                            "extension": "mp4",
                        }],
                    },
                }

        request = DownloadRequest(
            url="https://www.pinterest.com/pin/123/",
            platform=Platform.PINTEREST,
            quality=Quality.HIGHEST,
            include_metadata=True,
        )

        with patch("app.api.shared.universal_downloader", UniversalStub()):
            response = asyncio.run(download_public(Platform.PINTEREST, request, BackgroundTasks()))

        self.assertTrue(response.success)
        self.assertEqual(response.media_info.media_type, MediaType.VIDEO)
        self.assertEqual(response.downloads["videoHD"], "https://v.pinimg.com/video.m3u8")
        self.assertEqual(response.downloads["items"][0]["type"], "video")
        self.assertNotIn("image", response.downloads)

    def test_gallery_normalization_preserves_canonical_item_metadata_and_order(self):
        class UniversalStub:
            async def resolve_media(self, *args, **kwargs):
                items = [
                    {"id": "photo-1", "index": 0, "type": "image", "url": "https://cdn.example/1.webp", "extension": "webp", "mimeType": "image/webp"},
                    {"id": "video-2", "index": 1, "type": "video", "url": "https://cdn.example/2.mp4", "extension": "mp4", "mimeType": "video/mp4", "hasAudio": True},
                    {"id": "audio-3", "index": 2, "type": "audio", "url": "https://cdn.example/3.m4a", "extension": "m4a", "mimeType": "audio/mp4"},
                ]
                return {
                    "direct_url": items[0]["url"],
                    "title": "Mixed album",
                    "kind": "album",
                    "thumbnail": items[0]["url"],
                    "downloads": {"items": items, "images": [items[0]]},
                }

        request = DownloadRequest(
            url="https://www.instagram.com/p/abc123/",
            platform=Platform.INSTAGRAM,
            quality=Quality.HIGHEST,
        )
        with patch("app.api.shared.universal_downloader", UniversalStub()):
            response = asyncio.run(download_public(Platform.INSTAGRAM, request, BackgroundTasks()))

        items = response.downloads["items"]
        self.assertEqual([item["id"] for item in items], ["photo-1", "video-2", "audio-3"])
        self.assertEqual([item["index"] for item in items], [0, 1, 2])
        self.assertEqual(items[0]["mimeType"], "image/webp")
        self.assertTrue(items[1]["hasAudio"])
        self.assertEqual(items[2]["extension"], "m4a")

    def test_concurrent_identical_public_resolves_share_one_provider_call(self):
        calls = 0

        class SlowUniversalStub:
            async def resolve_media(self, *args, **kwargs):
                nonlocal calls
                calls += 1
                await asyncio.sleep(0.01)
                return {
                    "direct_url": "https://cdn.example/video.mp4",
                    "title": "Shared resolve",
                    "thumbnail": "https://cdn.example/thumb.jpg",
                    "ext": "mp4",
                    "kind": "video",
                    "downloads": {
                        "videoHD": "https://cdn.example/video.mp4",
                        "videoSD": "https://cdn.example/video.mp4",
                    },
                }

        async def run_requests():
            request = DownloadRequest(
                url="https://www.tiktok.com/@creator/video/1234567890123456789",
                platform=Platform.TIKTOK,
                quality=Quality.HIGHEST,
                include_metadata=True,
            )
            return await asyncio.gather(
                download_public(Platform.TIKTOK, request, BackgroundTasks()),
                download_public(Platform.TIKTOK, request, BackgroundTasks()),
                download_public(Platform.TIKTOK, request, BackgroundTasks()),
            )

        _resolve_cache.clear()
        _resolve_inflight.clear()
        with patch("app.api.shared.universal_downloader", SlowUniversalStub()):
            responses = asyncio.run(run_requests())

        self.assertEqual(calls, 1)
        self.assertTrue(all(response.success for response in responses))
        self.assertTrue(any(response.downloads["timing"]["singleFlight"] for response in responses))

    def test_public_cache_hit_skips_provider_work(self):
        calls = 0

        class UniversalStub:
            async def resolve_media(self, *args, **kwargs):
                nonlocal calls
                calls += 1
                return {
                    "direct_url": "https://cdn.example/cached.mp4",
                    "title": "Cached resolve",
                    "ext": "mp4",
                    "kind": "video",
                    "downloads": {"videoHD": "https://cdn.example/cached.mp4"},
                }

        request = DownloadRequest(
            url="https://www.tiktok.com/@creator/video/cache-hit",
            platform=Platform.TIKTOK,
            quality=Quality.HIGHEST,
            include_metadata=True,
        )
        _resolve_cache.clear()
        _resolve_inflight.clear()
        with patch("app.api.shared.universal_downloader", UniversalStub()):
            first = asyncio.run(download_public(Platform.TIKTOK, request, BackgroundTasks()))
            second = asyncio.run(download_public(Platform.TIKTOK, request, BackgroundTasks()))

        self.assertEqual(calls, 1)
        self.assertFalse(first.downloads["timing"]["cacheHit"])
        self.assertTrue(second.downloads["timing"]["cacheHit"])

    def test_public_resolve_timing_is_structured_and_does_not_log_full_url(self):
        class UniversalStub:
            async def resolve_media(self, *args, **kwargs):
                return {
                    "direct_url": "https://cdn.example/video.mp4?secret_token=do-not-log",
                    "title": "Timed resolve",
                    "thumbnail": "https://cdn.example/thumb.jpg",
                    "ext": "mp4",
                    "kind": "video",
                    "downloads": {
                        "videoHD": "https://cdn.example/video.mp4?secret_token=do-not-log",
                        "videoSD": "https://cdn.example/video.mp4?secret_token=do-not-log",
                    },
                }

        request = DownloadRequest(
            url="https://www.tiktok.com/@creator/video/9876543210987654321?token=do-not-log",
            platform=Platform.TIKTOK,
            quality=Quality.HIGHEST,
            include_metadata=True,
        )

        _resolve_cache.clear()
        _resolve_inflight.clear()
        stdout = io.StringIO()
        with patch("app.api.shared.universal_downloader", UniversalStub()), redirect_stdout(stdout):
            response = asyncio.run(download_public(Platform.TIKTOK, request, BackgroundTasks()))

        timing = response.downloads["timing"]
        self.assertEqual(timing["platform"], "tiktok")
        self.assertFalse(timing["cacheHit"])
        self.assertGreaterEqual(timing["providerResolveMs"], 0)
        self.assertGreaterEqual(timing["normalizationMs"], 0)
        self.assertGreaterEqual(timing["totalMs"], 0)
        self.assertEqual(timing["resultCount"], 1)
        self.assertNotIn("do-not-log", stdout.getvalue())

    def test_authenticated_requests_bypass_public_cache_and_singleflight(self):
        calls = 0

        class UniversalStub:
            async def resolve_media(self, *args, **kwargs):
                nonlocal calls
                calls += 1
                return {
                    "direct_url": f"https://cdn.example/video-{calls}.mp4",
                    "title": "Private resolve",
                    "thumbnail": "https://cdn.example/thumb.jpg",
                    "ext": "mp4",
                    "kind": "video",
                    "downloads": {
                        "videoHD": f"https://cdn.example/video-{calls}.mp4",
                    },
                }

        request = DownloadRequest(
            url="https://www.instagram.com/stories/creator/1234567890/",
            platform=Platform.INSTAGRAM,
            quality=Quality.HIGHEST,
            include_metadata=True,
            user_auth=UserAuth(session_id="private-session"),
        )

        _resolve_cache.clear()
        _resolve_inflight.clear()
        with patch("app.api.shared.universal_downloader", UniversalStub()):
            first = asyncio.run(download_public(Platform.INSTAGRAM, request, BackgroundTasks()))
            second = asyncio.run(download_public(Platform.INSTAGRAM, request, BackgroundTasks()))

        self.assertEqual(calls, 2)
        self.assertFalse(first.downloads["timing"]["cacheHit"])
        self.assertFalse(second.downloads["timing"]["cacheHit"])

    def test_public_resolve_timeout_returns_controlled_provider_error(self):
        class SlowUniversalStub:
            async def resolve_media(self, *args, **kwargs):
                await asyncio.sleep(0.05)
                return {
                    "direct_url": "https://cdn.example/video.mp4",
                    "kind": "video",
                    "downloads": {"videoHD": "https://cdn.example/video.mp4"},
                }

        request = DownloadRequest(
            url="https://www.tiktok.com/@creator/video/1234567890123456789",
            platform=Platform.TIKTOK,
            quality=Quality.HIGHEST,
            include_metadata=True,
        )

        _resolve_cache.clear()
        _resolve_inflight.clear()
        with patch("app.api.shared.universal_downloader", SlowUniversalStub()), \
             patch("app.api.shared.settings.RESOLVER_TIMEOUT_SECONDS", 0.01):
            response = asyncio.run(download_public(Platform.TIKTOK, request, BackgroundTasks()))

        self.assertFalse(response.success)
        self.assertEqual(response.error_code, "PROVIDER_TIMEOUT")
        self.assertEqual(response.status, "failed")

    def test_timing_payload_exposes_performance_slo_fields(self):
        timing = _timing_payload(
            platform=Platform.YOUTUBE,
            cache_hit=False,
            single_flight=False,
            queue_wait_ms=3,
            provider_resolve_ms=40,
            normalization_ms=2,
            total_ms=50,
            result_count=3,
        )

        for key in (
            "validationMs",
            "routingMs",
            "vercelMs",
            "renderQueueMs",
            "extractorStartupMs",
            "providerMs",
            "providerResolveMs",
            "normalizationMs",
            "responseMs",
            "totalMs",
        ):
            self.assertIn(key, timing)

    def test_fallback_download_uses_actual_extension_when_requested_filename_is_stale(self):
        filename = _filename_for_fallback(
            requested_filename="TikTok sound.m4a",
            fallback_filename="TikTok sound.mp3",
        )

        self.assertEqual(filename, "TikTok sound.mp3")

    def test_youtube_dash_video_only_formats_use_server_mux_file_endpoints(self):
        downloader = PublicPlatformDownloader()

        async def fake_extract(*args, **kwargs):
            return {
                "title": "DASH sample",
                "thumbnail": "https://i.ytimg.com/vi/example/hqdefault.jpg",
                "formats": [
                    {
                        "format_id": "137",
                        "url": "https://rr1---sn.example.googlevideo.com/videoplayback?v=video-only",
                        "ext": "mp4",
                        "height": 1080,
                        "vcodec": "avc1",
                        "acodec": "none",
                    },
                    {
                        "format_id": "140",
                        "url": "https://rr1---sn.example.googlevideo.com/videoplayback?v=audio-only",
                        "ext": "m4a",
                        "vcodec": "none",
                        "acodec": "mp4a",
                    },
                ],
            }

        downloader._extract_youtube_with_profiles = fake_extract

        result = asyncio.run(
            downloader.resolve_media("https://www.youtube.com/watch?v=abc123", Quality.HIGH)
        )

        self.assertEqual(result["kind"], "video")
        self.assertTrue(result["downloads"]["videoHD"].startswith("/youtube/file?"))
        self.assertIn("variant=hd", result["downloads"]["videoHD"])
        self.assertIn("variant=sd", result["downloads"]["videoSD"])
        self.assertIn("variant=audio", result["downloads"]["audio"])
        self.assertNotIn("googlevideo.com", result["downloads"]["videoHD"])
        self.assertEqual(result["downloads"]["items"][0]["type"], "video")
        self.assertEqual(result["downloads"]["items"][0]["hasAudio"], True)

    def test_progressive_video_audio_format_remains_direct_download(self):
        downloader = PublicPlatformDownloader()

        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Progressive sample",
                "thumbnail": "https://cdn.example/thumb.jpg",
                "formats": [
                    {
                        "url": "https://cdn.example/progressive.mp4",
                        "ext": "mp4",
                        "height": 720,
                        "vcodec": "avc1",
                        "acodec": "aac",
                    },
                ],
            }

            result = asyncio.run(downloader.resolve_media("https://www.instagram.com/reel/abc123/", Quality.HIGH))

        self.assertEqual(result["downloads"]["videoHD"], "https://cdn.example/progressive.mp4")
        self.assertEqual(result["downloads"]["videoSD"], "https://cdn.example/progressive.mp4")
        self.assertEqual(result["downloads"]["items"][0]["hasAudio"], True)
        self.assertNotIn("/download/file", result["downloads"]["videoHD"])

    def test_split_video_audio_formats_use_managed_mux_downloads(self):
        downloader = PublicPlatformDownloader()

        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Split sample",
                "thumbnail": "https://cdn.example/thumb.jpg",
                "formats": [
                    {
                        "url": "https://cdn.example/video-only.mp4",
                        "ext": "mp4",
                        "height": 1080,
                        "vcodec": "avc1",
                        "acodec": "none",
                    },
                    {
                        "url": "https://cdn.example/audio-only.m4a",
                        "ext": "m4a",
                        "vcodec": "none",
                        "acodec": "aac",
                    },
                ],
            }

            result = asyncio.run(downloader.resolve_media("https://www.reddit.com/r/test/comments/abc/title/", Quality.HIGH))

        self.assertTrue(result["downloads"]["videoHD"].startswith("/download/file?"))
        self.assertIn("mediaType=hd", result["downloads"]["videoHD"])
        self.assertTrue(result["downloads"]["videoSD"].startswith("/download/file?"))
        self.assertEqual(result["downloads"]["audio"], "https://cdn.example/audio-only.m4a")
        self.assertEqual(result["downloads"]["items"][0]["type"], "video")
        self.assertEqual(result["downloads"]["items"][0]["hasAudio"], True)
        self.assertNotEqual(result["downloads"]["videoHD"], "https://cdn.example/video-only.mp4")

    def test_silent_video_source_does_not_invent_audio(self):
        downloader = PublicPlatformDownloader()

        with patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Silent sample",
                "thumbnail": "https://cdn.example/thumb.jpg",
                "formats": [
                    {
                        "url": "https://cdn.example/silent.mp4",
                        "ext": "mp4",
                        "height": 720,
                        "vcodec": "avc1",
                        "acodec": "none",
                    },
                ],
            }

            result = asyncio.run(downloader.resolve_media("https://www.instagram.com/reel/silent/", Quality.HIGH))

        self.assertEqual(result["downloads"]["videoHD"], "https://cdn.example/silent.mp4")
        self.assertNotIn("audio", result["downloads"])
        self.assertEqual(result["downloads"]["items"][0]["hasAudio"], False)

    def test_youtube_variant_download_reports_mux_verification_for_long_complete_files(self):
        downloader = PublicPlatformDownloader(download_path=".")

        with patch.object(downloader, "get_ydl_opts", return_value={}), \
             patch.object(downloader, "_apply_cookiefile_for_url", side_effect=lambda opts, _url: opts), \
             patch.object(downloader, "_apply_proxy_for_url", side_effect=lambda opts, _url: opts), \
             patch.object(downloader, "_cookie_names_for_url", return_value=[]), \
             patch.object(downloader, "_youtube_client_profiles", return_value=[("test", None, False, False)]), \
             patch("app.platforms.public_platforms.os.makedirs"), \
             patch("app.platforms.public_platforms.os.listdir", return_value=["fixed-id.mp4"]), \
             patch("app.platforms.public_platforms.os.path.getmtime", return_value=1), \
             patch("app.platforms.public_platforms.os.path.getsize", return_value=5_000_000), \
             patch("app.platforms.public_platforms.uuid.uuid4", return_value="fixed-id"), \
             patch.object(
                 downloader,
                 "_verify_downloaded_media",
                 return_value={
                     "available": True,
                     "fileSize": 5_000_000,
                     "containerOpens": True,
                     "duration": 10800.0,
                     "durationCloseToExpected": True,
                     "audioPresent": True,
                     "videoPresent": True,
                     "complete": True,
                 },
             ) as verify_mock, \
             patch("app.platforms.public_platforms.yt_dlp.YoutubeDL") as ydl_mock:
            ydl_mock.return_value.__enter__.return_value.extract_info.return_value = {
                "title": "Three hour public video",
                "duration": 10800.0,
            }

            result = asyncio.run(
                downloader.download_youtube_variant(
                    "https://youtu.be/abc123?feature=share",
                    "hd",
                )
            )

        self.assertEqual(result["filename"], "Three hour public video.mp4")
        self.assertEqual(result["media_type"], "video/mp4")
        self.assertEqual(result["verification"]["duration"], 10800.0)
        self.assertTrue(result["verification"]["complete"])
        self.assertTrue(result["verification"]["audioPresent"])
        self.assertTrue(result["verification"]["videoPresent"])
        verify_mock.assert_called_once_with(os.path.join(".", "fixed-id.mp4"), expected_duration=10800.0, expect_audio=True, expect_video=True)


if __name__ == "__main__":
    unittest.main()
