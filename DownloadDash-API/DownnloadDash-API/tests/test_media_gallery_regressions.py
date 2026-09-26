import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import BackgroundTasks

from app.api.shared import _gallery_result_is_richer, _should_try_gallery_enrichment, download_public
from app.models.schemas import DownloadRequest
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


if __name__ == "__main__":
    unittest.main()
