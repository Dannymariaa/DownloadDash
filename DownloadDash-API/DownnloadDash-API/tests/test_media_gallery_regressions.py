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
             patch("app.platforms.universal_downloader.TikTokScraper") as scraper_mock:
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
