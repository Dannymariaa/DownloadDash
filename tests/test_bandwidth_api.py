import json
import unittest
from unittest.mock import patch

import app as api
from downloader import _is_allowed_content_type, _parse_metadata


class BandwidthApiTests(unittest.TestCase):
    def test_blocks_non_metadata_content_types(self):
        self.assertFalse(_is_allowed_content_type("video/mp4"))
        self.assertFalse(_is_allowed_content_type("image/png"))
        self.assertFalse(_is_allowed_content_type("text/css"))
        self.assertTrue(_is_allowed_content_type("text/html; charset=utf-8"))
        self.assertTrue(_is_allowed_content_type("application/json"))

    def test_parse_metadata_from_head_fragment(self):
        fragment = """
        <head>
          <title> Example Video </title>
          <meta property="og:description" content="Short public description">
          <meta property="og:video:secure_url" content="https://cdn.example/video.mp4">
        </head>
        """

        metadata = _parse_metadata(fragment)

        self.assertEqual(metadata["title"], "Example Video")
        self.assertEqual(metadata["description"], "Short public description")
        self.assertEqual(metadata["media_url"], "https://cdn.example/video.mp4")

    def test_extract_uses_cache_before_network(self):
        cached = {
            "platform": "generic",
            "url": "https://example.test/post",
            "metadata": {"title": "Cached", "body_bytes_read": 123},
        }
        called = {"network": False}

        def fake_extract_metadata(url):
            called["network"] = True
            return {}

        with patch.object(api, "get_cache", return_value=(cached, "memory")), patch.object(
            api, "extract_metadata", side_effect=fake_extract_metadata
        ):
            client = api.app.test_client()
            response = client.get("/extract?url=https://example.test/post")

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.data)
        self.assertTrue(payload["cached"])
        self.assertEqual(payload["result"]["metadata"]["title"], "Cached")
        self.assertFalse(called["network"])


if __name__ == "__main__":
    unittest.main()
