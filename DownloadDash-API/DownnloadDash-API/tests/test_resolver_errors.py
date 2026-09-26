import asyncio
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi import BackgroundTasks

from app.api.cookie_state import inspect_netscape_cookiefile
from app.api.resolver_errors import classify_resolver_error
from app.api.shared import download_public
from app.models.schemas import DownloadRequest
from app.models.schemas import Platform


class ResolverErrorClassificationTests(unittest.TestCase):
    def test_instagram_login_and_antibot_are_not_media_not_found(self):
        cases = [
            ("Login required to access this profile", "COOKIE_REQUIRED"),
            ("Please wait a few minutes before you try again", "RATE_LIMITED"),
            ("HTTP Error 403: Forbidden", "PLATFORM_BLOCKED_PROXY"),
            ("Unable to extract additional data", "EXTRACTOR_FAILED"),
        ]

        for raw_error, expected in cases:
            with self.subTest(raw_error=raw_error):
                result = classify_resolver_error(Platform.INSTAGRAM, raw_error)

                self.assertEqual(result, expected)
                self.assertNotEqual(result, "MEDIA_NOT_FOUND")
                self.assertNotEqual(result, "PRIVATE_MEDIA")

    def test_facebook_login_challenge_is_cookie_required_not_private_media(self):
        raw_error = (
            "Facebook HTML diagnostic: facebook_http_status=200 "
            "html_kind=login cookiefile_applied=False proxy_applied=False"
        )

        result = classify_resolver_error(Platform.FACEBOOK, raw_error)

        self.assertEqual(result, "COOKIE_REQUIRED")

    def test_facebook_checkpoint_challenge_is_antibot_challenge(self):
        raw_error = (
            "Facebook HTML diagnostic: facebook_http_status=200 "
            "html_kind=challenge cookiefile_applied=True proxy_applied=False"
        )

        result = classify_resolver_error(Platform.FACEBOOK, raw_error)

        self.assertEqual(result, "ANTI_BOT_CHALLENGE")

    def test_facebook_upstream_parser_breakage_is_extractor_outdated(self):
        raw_error = "Facebook said: Unable to extract relay data; please report this issue on https://github.com/yt-dlp/yt-dlp"

        result = classify_resolver_error(Platform.FACEBOOK, raw_error)

        self.assertEqual(result, "EXTRACTOR_OUTDATED")

    def test_facebook_private_media_requires_private_signal(self):
        raw_error = "This content is not available because the owner only shared it with a small group"

        result = classify_resolver_error(Platform.FACEBOOK, raw_error)

        self.assertEqual(result, "PRIVATE_MEDIA")

    def test_twitter_media_less_and_deleted_are_distinct_from_auth_failures(self):
        cases = [
            ("No media found in this tweet", "MEDIA_NOT_FOUND"),
            ("Sorry, that page does not exist", "MEDIA_NOT_FOUND"),
            ("HTTP Error 401: Unauthorized. Use --cookies", "COOKIE_REQUIRED"),
            ("Resolve failed: no direct URL found", "COOKIE_REQUIRED"),
            ("Twitter API returned 429 Too Many Requests", "RATE_LIMITED"),
            ("Tunnel connection failed: 407 Proxy Authentication Required", "PROXY_AUTH_FAILED"),
        ]

        for raw_error, expected in cases:
            with self.subTest(raw_error=raw_error):
                self.assertEqual(classify_resolver_error(Platform.TWITTER, raw_error), expected)

    def test_cookie_state_counts_httponly_rows_and_detects_expired_file(self):
        with TemporaryDirectory() as temp_dir:
            cookiefile = Path(temp_dir) / "cookies.txt"
            cookiefile.write_text(
                "# Netscape HTTP Cookie File\n"
                "#HttpOnly_.x.com\tTRUE\t/\tTRUE\t1\tauth_token\tredacted\n"
                ".x.com\tTRUE\t/\tTRUE\t1\tct0\tredacted\n",
                encoding="utf-8",
            )

            state = inspect_netscape_cookiefile(str(cookiefile))

        self.assertTrue(state["generated"])
        self.assertTrue(state["readable"])
        self.assertTrue(state["loaded"])
        self.assertEqual(state["cookieCount"], 2)
        self.assertEqual(state["expired"], "YES")
        self.assertEqual(state["expiredCookieCount"], 2)
        self.assertEqual(state["nonExpiredCookieCount"], 0)
        self.assertEqual(state["earliestExpiry"], 1)
        self.assertEqual(state["latestExpiry"], 1)

    def test_cookie_state_reports_partial_expiry_without_cookie_names(self):
        with TemporaryDirectory() as temp_dir:
            cookiefile = Path(temp_dir) / "cookies.txt"
            cookiefile.write_text(
                "# Netscape HTTP Cookie File\n"
                ".x.com\tTRUE\t/\tTRUE\t1\tauth_token\tredacted\n"
                ".x.com\tTRUE\t/\tTRUE\t4102444800\tct0\tredacted\n"
                ".x.com\tTRUE\t/\tTRUE\t0\tguest_id\tredacted\n",
                encoding="utf-8",
            )

            state = inspect_netscape_cookiefile(str(cookiefile))

        self.assertEqual(state["cookieCount"], 3)
        self.assertEqual(state["expiredCookieCount"], 1)
        self.assertEqual(state["nonExpiredCookieCount"], 1)
        self.assertEqual(state["sessionCookieCount"], 1)
        self.assertEqual(state["expired"], "PARTIAL")
        self.assertEqual(state["earliestExpiry"], 1)
        self.assertEqual(state["latestExpiry"], 4102444800)
        self.assertNotIn("auth_token", str(state))

    def test_x_cookie_required_promotes_to_cookie_expired_when_cookiefile_is_stale(self):
        class UniversalStub:
            async def resolve_media(self, *args, **kwargs):
                raise RuntimeError("HTTP Error 401: Unauthorized. Use --cookies")

        class GalleryStub:
            async def resolve(self, *args, **kwargs):
                raise RuntimeError("gallery disabled for test")

        class PublicStub:
            def __init__(self, cookiefile):
                self.cookiefile = cookiefile

            def _cookiefile_for_url(self, url):
                return self.cookiefile

        with TemporaryDirectory() as temp_dir:
            cookiefile = Path(temp_dir) / "cookies.txt"
            cookiefile.write_text(
                ".x.com\tTRUE\t/\tTRUE\t1\tauth_token\tredacted\n",
                encoding="utf-8",
            )
            request = DownloadRequest(url="https://x.com/example/status/123", platform=Platform.X)

            with patch("app.api.shared.universal_downloader", UniversalStub()), \
                 patch("app.api.shared.gallery_downloader", GalleryStub()), \
                 patch("app.api.shared.public_downloader", PublicStub(str(cookiefile))):
                response = asyncio.run(download_public(Platform.X, request, BackgroundTasks()))

        self.assertFalse(response.success)
        self.assertEqual(response.error_code, "COOKIE_EXPIRED")

    def test_x_login_and_empty_metadata_are_not_extractor_outdated(self):
        cases = [
            ("Twitter/X login required. Please use --cookies", "COOKIE_REQUIRED"),
            (
                "Authorization: Denied by access control: To protect our users from spam and other malicious activity, "
                "this account is temporarily locked. Please log in to https://twitter.com to unlock your account.; "
                "please report this issue on https://github.com/yt-dlp/yt-dlp/issues",
                "LOGIN_REQUIRED",
            ),
            ("gallery-dl returned metadata with zero entries", "EXTRACTOR_FAILED"),
            ("HTTP Error 429: Too Many Requests", "RATE_LIMITED"),
            ("HTTP Error 403: Forbidden", "PLATFORM_BLOCKED_PROXY"),
        ]

        for raw_error, expected in cases:
            with self.subTest(raw_error=raw_error):
                self.assertEqual(classify_resolver_error(Platform.X, raw_error), expected)

    def test_x_schema_breakage_can_still_be_extractor_outdated(self):
        raw_error = "Twitter said: Unable to extract GraphQL data; please report this issue on https://github.com/yt-dlp/yt-dlp"

        self.assertEqual(classify_resolver_error(Platform.X, raw_error), "EXTRACTOR_OUTDATED")


if __name__ == "__main__":
    unittest.main()
