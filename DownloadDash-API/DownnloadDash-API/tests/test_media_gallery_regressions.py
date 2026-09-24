import asyncio
import unittest
from unittest.mock import patch

from app.models.schemas import MediaType, Quality
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


if __name__ == "__main__":
    unittest.main()
