import unittest

from app.api.resolver_errors import classify_resolver_error
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
        raw_error = "Facebook returned login form / checkpoint challenge HTML"

        result = classify_resolver_error(Platform.FACEBOOK, raw_error)

        self.assertEqual(result, "COOKIE_REQUIRED")

    def test_facebook_private_media_requires_private_signal(self):
        raw_error = "This content is not available because the owner only shared it with a small group"

        result = classify_resolver_error(Platform.FACEBOOK, raw_error)

        self.assertEqual(result, "PRIVATE_MEDIA")

    def test_twitter_media_less_and_deleted_are_distinct_from_auth_failures(self):
        cases = [
            ("No media found in this tweet", "MEDIA_NOT_FOUND"),
            ("Sorry, that page does not exist", "MEDIA_NOT_FOUND"),
            ("HTTP Error 401: Unauthorized. Use --cookies", "COOKIE_REQUIRED"),
            ("Twitter API returned 429 Too Many Requests", "RATE_LIMITED"),
            ("Tunnel connection failed: 407 Proxy Authentication Required", "PROXY_AUTH_FAILED"),
        ]

        for raw_error, expected in cases:
            with self.subTest(raw_error=raw_error):
                self.assertEqual(classify_resolver_error(Platform.TWITTER, raw_error), expected)


if __name__ == "__main__":
    unittest.main()
