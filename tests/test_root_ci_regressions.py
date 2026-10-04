"""Offline regression coverage for root metadata API boundaries and failures."""

import os
import socket
import time
import unittest
from unittest.mock import Mock, patch

import redis
import requests

import app as api
import cache
import downloader
import proxy
import security
from config import Config
from metrics import Metrics
from rate_limit import _client_ip, reset_rate_limits

URL = "https://example.test/post"


class CacheRegressionTests(unittest.TestCase):
    def setUp(self):
        self.memory = cache.MemoryLRU(10, 60)
        self.redis = Mock()
        self.enterContext(patch.object(cache, "memory_cache", self.memory))
        self.enterContext(patch.object(cache, "redis_client", self.redis))

    def test_redis_hit_can_be_read_again_from_warmed_memory(self):
        payload = {"metadata": {"title": "promoted from Redis"}}
        self.redis.get.return_value = cache._pack(payload)
        self.assertEqual(cache.get_cache(URL), (payload, "redis"))
        self.assertEqual(cache.get_cache(URL), (payload, "memory"))
        self.assertEqual(cache.get_stale_cache(URL), payload)
        self.redis.get.assert_called_once()

    def test_memory_expiration_and_json_compatibility(self):
        with patch.object(cache.time, "time", return_value=100):
            self.memory.set("key", "value")
        with patch.object(cache.time, "time", return_value=160):
            self.assertIsNone(self.memory.get("key"))
        self.assertEqual(cache._unpack('{"title":"old"}'), {"title": "old"})
        for invalid in (b"bad gzip", "not json", b"\x1f\x8bgarbage"):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                cache._unpack(invalid)
        with patch.object(Config, "MAX_CACHE_PAYLOAD_BYTES", 2), self.assertRaises(ValueError):
            cache._unpack("long")

    def test_cache_write_populates_memory_and_both_redis_expirations(self):
        payload = {"metadata": {"title": "cached"}}
        cache.set_cache(URL, payload)
        self.assertEqual(cache.get_cache(URL), (payload, "memory"))
        self.assertEqual(cache.get_stale_cache(URL), payload)
        calls = self.redis.setex.call_args_list
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0].args[:2], (cache.generate_cache_key(URL), Config.CACHE_TTL))
        self.assertEqual(
            calls[1].args[:2], (cache._redis_key("stale", URL), Config.STALE_CACHE_TTL)
        )
        self.assertEqual(cache._unpack(calls[0].args[2]), payload)

    def test_cache_reads_handle_missing_invalid_and_failed_redis(self):
        for reader, empty in (
            (cache.get_cache, (None, "miss")),
            (cache.get_stale_cache, None),
            (cache.get_validators, {}),
        ):
            for value in (None, b"corrupt"):
                self.memory._items.clear()
                self.redis.get.return_value = value
                with self.subTest(reader=reader.__name__, value=value):
                    self.assertEqual(reader(URL), empty)
                    self.assertIsNone(self.memory.get(cache.generate_cache_key(URL)))
            self.memory._items.clear()
            self.redis.get.side_effect = redis.ConnectionError("offline")
            self.assertEqual(reader(URL), empty)
            self.redis.get.side_effect = None
            self.redis.get.return_value = cache._pack({"etag": "v1"})
            expected = ({"etag": "v1"}, "redis") if reader == cache.get_cache else {"etag": "v1"}
            self.assertEqual(reader(URL), expected)
            self.memory._items.clear()
        with patch.object(cache, "redis_client", None):
            self.assertEqual(cache.get_cache(URL), (None, "miss"))
            self.assertIsNone(cache.get_stale_cache(URL))
            self.assertEqual(cache.get_validators(URL), {})
            cache.set_validators(URL, {"etag": "v1"})
            cache.set_cache(URL, {"title": "local"})
            self.assertEqual(cache.get_cache(URL)[0], {"title": "local"})
            self.assertFalse(cache.redis_health()["configured"])

    def test_validator_writes_filter_empty_values_and_survive_redis_failure(self):
        cache.set_validators(URL, {})
        self.redis.setex.assert_not_called()
        cache.set_validators(URL, {"etag": "v1", "last_modified": ""})
        args = self.redis.setex.call_args.args
        self.assertEqual(args[:2], (cache._redis_key("validator", URL), Config.VALIDATOR_CACHE_TTL))
        self.assertEqual(cache._unpack(args[2]), {"etag": "v1"})
        self.redis.setex.side_effect = redis.ConnectionError("offline")
        cache.set_validators(URL, {"etag": "v2"})
        cache.set_cache(URL, {"title": "still cached"})
        self.assertEqual(cache.get_cache(URL)[0]["title"], "still cached")

    def test_redis_creation_and_health(self):
        with (
            patch.object(Config, "REDIS_URL", "redis://example.test/0"),
            patch.object(cache.redis.Redis, "from_url", return_value=self.redis) as factory,
        ):
            self.assertIs(cache._redis_client(), self.redis)
            factory.assert_called_once_with(Config.REDIS_URL, decode_responses=False)
        with (
            patch.object(Config, "REDIS_URL", ""),
            patch.object(cache.redis, "Redis", return_value=self.redis),
        ):
            self.assertIs(cache._redis_client(), self.redis)
            self.redis.ping.side_effect = redis.ConnectionError("offline")
            self.assertIsNone(cache._redis_client())
        self.assertFalse(cache.redis_health()["ok"])
        self.redis.ping.side_effect = None
        self.assertTrue(cache.redis_health()["ok"])


class SecurityRegressionTests(unittest.TestCase):
    def test_invalid_url_boundaries_are_rejected_offline(self):
        cases = [
            None,
            "",
            "a" * (Config.MAX_URL_LENGTH + 1),
            "https:///path",
            "https://example.test:invalid",
            "https://example.test:70000",
            "https://foo.localhost",
            "https://\ud800.test",
        ]
        for value in cases:
            with self.subTest(value=value), self.assertRaises(security.SecurityValidationError):
                security.validate_public_url(value)

    def test_public_hosts_and_dns_failures(self):
        with patch.object(
            security.socket, "getaddrinfo", return_value=[(0, 0, 0, "", ("8.8.8.8", 0))]
        ):
            self.assertEqual(security.validate_public_url("  " + URL + "  "), URL)
        self.assertEqual(
            security.validate_public_url("https://8.8.8.8/path"), "https://8.8.8.8/path"
        )
        with (
            patch.object(security.socket, "getaddrinfo", side_effect=socket.gaierror("unresolved")),
            self.assertRaisesRegex(security.SecurityValidationError, "resolved"),
        ):
            security.validate_public_url(URL)

    def test_optional_api_key_guard(self):
        endpoint = security.require_api_key(lambda: "allowed")
        with patch.dict(os.environ, {"REQUIRE_API_KEY": "0"}), api.app.test_request_context("/"):
            self.assertEqual(endpoint(), "allowed")
        with (
            patch.dict(os.environ, {"REQUIRE_API_KEY": "1"}),
            patch.object(Config, "DOWNLOADDASH_API_KEY", "test-key"),
        ):
            with api.app.test_request_context("/"):
                response, status = endpoint()
                self.assertEqual(status, 401)
                self.assertEqual(response.get_json()["code"], "unauthorized")
            with api.app.test_request_context("/", headers={Config.API_KEY_HEADER: "test-key"}):
                self.assertEqual(endpoint(), "allowed")


class MetadataRegressionTests(unittest.TestCase):
    def response(self, status=200, content_type="text/html", chunks=()):
        response = Mock(
            status_code=status,
            headers={"Content-Type": content_type, "ETag": "v1", "Location": "https://other.test/"},
        )
        response.iter_content.return_value = iter(chunks)
        response.raw.retries.history = ()
        return response

    def call_response(self, response, operation):
        with patch.object(
            downloader,
            "_request",
            return_value=(response, time.monotonic(), 0, response.status_code, 0, False),
        ):
            return operation(URL, "generic")

    def test_platform_detection_and_metadata_normalization(self):
        for host, platform in (
            ("youtube.com", "youtube"),
            ("tiktok.com", "tiktok"),
            ("instagram.com", "instagram"),
            ("fb.watch", "facebook"),
            ("x.com", "x"),
            ("reddit.com", "reddit"),
            ("pin.it", "pinterest"),
            ("example.test", "generic"),
        ):
            self.assertEqual(downloader.detect_platform("https://" + host), platform)
        data = downloader._parse_metadata(
            '<meta content="A &amp; B" property="og:title"><meta name="og:image" content="thumb"><meta property="og:type" content="video">'
        )
        self.assertEqual(data, {"title": "A & B", "thumbnail_url": "thumb", "type": "video"})
        self.assertEqual(downloader._normalize_meta_name("unknown"), "unknown")
        self.assertTrue(downloader._is_allowed_content_type(None))
        self.assertFalse(downloader._is_allowed_content_type("application/octet-stream"))
        self.assertFalse(downloader._is_allowed_content_type("font/woff"))

    def test_head_statuses_always_close_response(self):
        for status, content_type, enough, key in (
            (304, "text/html", True, "not_modified"),
            (503, "text/html", False, "status_code"),
            (302, "text/html", True, "redirect_url"),
            (200, "video/mp4", True, "blocked_body_fetch"),
            (200, "text/html", False, "content_type"),
        ):
            response = self.response(status, content_type)
            metadata, actual = self.call_response(response, downloader._head_probe)
            self.assertEqual(actual, enough)
            self.assertIn(key, metadata)
            response.close.assert_called_once()
            response.iter_content.assert_not_called()

    def test_partial_statuses_and_blocked_media_always_close(self):
        for status, content_type, error in (
            (304, "text/html", None),
            (302, "text/html", None),
            (500, "text/html", ValueError),
            (200, "video/mp4", downloader.UpstreamBlocked),
        ):
            response = self.response(status, content_type)
            if error:
                with self.assertRaises(error):
                    self.call_response(response, downloader._get_partial_metadata)
            else:
                data = self.call_response(response, downloader._get_partial_metadata)
                self.assertEqual(data["status_code"], status)
                self.assertEqual(data["body_bytes_read"], 0)
            response.close.assert_called_once()

    def test_partial_reader_stops_at_head_metadata_or_byte_limit(self):
        for chunks, limit, expected in (
            ([b"", b"abc", b"def"], 3, 3),
            ([b"<head></head>", b"ignored"], 100, 13),
            ([b"<title>A</title><meta name='description' content='B'>", b"ignored"], 100, 53),
            ([b"abc"], 100, 3),
        ):
            response = self.response(chunks=chunks)
            with patch.object(Config, "MAX_HTML_BYTES", limit):
                result = self.call_response(response, downloader._get_partial_metadata)
            self.assertEqual(result["body_bytes_read"], expected)
            response.close.assert_called_once()

    def test_request_sends_conditional_headers_and_never_follows_redirects(self):
        response = self.response()
        session = Mock()
        session.request.return_value = response
        with (
            patch.object(downloader, "session_for_proxy", return_value=session),
            patch.object(Config, "PROXY_URL", "http://proxy.test"),
        ):
            result = downloader._request(
                "GET", URL, "generic", {"etag": "v1", "last_modified": "yesterday"}, True
            )
        self.assertIs(result[0], response)
        self.assertTrue(result[-1])
        self.assertEqual(
            session.request.call_args.kwargs["headers"],
            {"If-None-Match": "v1", "If-Modified-Since": "yesterday"},
        )
        self.assertFalse(session.request.call_args.kwargs["allow_redirects"])
        with api.app.test_request_context("/"):
            self.assertEqual(downloader._request_id(), "-")
        with patch.object(downloader, "metrics") as metrics:
            downloader._close_and_log(None, time.monotonic(), "generic", "HEAD", URL, 0)
            metrics.record_upstream.assert_called_once()

    def test_extraction_reuses_stale_for_conditional_head_and_get(self):
        for head in (True, False):
            stale = {"metadata": {"title": "existing"}}
            with (
                patch.object(
                    downloader, "_head_probe", return_value=({"not_modified": head}, head)
                ),
                patch.object(
                    downloader, "_get_partial_metadata", return_value={"not_modified": True}
                ),
                patch.object(downloader, "set_validators") as save,
            ):
                result = downloader._extract_metadata_attempt(URL, "generic", {"etag": "v1"}, stale)
            self.assertIs(result, stale)
            self.assertIn("head" if head else "get", result["network_strategy"])
            save.assert_not_called()

    def test_extraction_merges_head_and_body_and_saves_validators(self):
        for enough in (True, False):
            with (
                patch.object(downloader, "_head_probe", return_value=({"etag": "v1"}, enough)),
                patch.object(
                    downloader, "_get_partial_metadata", return_value={"title": "body"}
                ) as get,
                patch.object(downloader, "set_validators") as save,
            ):
                result = downloader._extract_metadata_attempt(URL, "generic", {}, None)
            self.assertEqual(
                result["metadata"], {"etag": "v1"} if enough else {"etag": "v1", "title": "body"}
            )
            self.assertEqual(get.call_count, int(not enough))
            save.assert_called_once_with(URL, result["metadata"])

    def test_extract_direct_failure_proxy_retry_and_no_proxy_reraise(self):
        with (
            patch.object(downloader, "validate_public_url", return_value=URL),
            patch.object(downloader, "get_validators", return_value={"etag": "v1"}),
            patch.object(downloader, "get_stale_cache", return_value=None),
            patch.object(
                downloader,
                "_extract_metadata_attempt",
                side_effect=[requests.Timeout(), {"title": "fallback"}],
            ) as attempt,
            patch.object(Config, "PROXY_URL", "http://proxy.test"),
        ):
            self.assertEqual(downloader.extract_metadata(URL), {"title": "fallback"})
            self.assertEqual(attempt.call_args_list[0].args[2], {})
            self.assertFalse(attempt.call_args_list[0].kwargs["use_proxy"])
            self.assertTrue(attempt.call_args_list[1].kwargs["use_proxy"])
        with (
            patch.object(downloader, "validate_public_url", return_value=URL),
            patch.object(downloader, "get_validators", return_value={}),
            patch.object(downloader, "_extract_metadata_attempt", side_effect=requests.Timeout()),
            patch.object(Config, "PROXY_URL", ""),
            self.assertRaises(requests.Timeout),
        ):
            downloader.extract_metadata(URL)


class ApiRegressionTests(unittest.TestCase):
    def setUp(self):
        reset_rate_limits()
        self.client = api.app.test_client()
        self.enterContext(patch.object(api, "validate_public_url", return_value=URL))

    def test_missing_invalid_platform_and_methods(self):
        self.assertTrue(self.client.get("/").get_json()["success"])
        self.assertEqual(self.client.post("/extract", json={}).get_json()["code"], "missing_url")
        self.assertEqual(
            self.client.get("/extract?url=x&platform=invalid").get_json()["code"], "invalid_input"
        )
        self.assertEqual(self.client.delete("/health").get_json()["code"], "method_not_allowed")
        self.assertIsNone(api._validate_platform(""))

    def test_post_normalizes_supported_result_shapes(self):
        shapes = [
            ("medias", [{"url": "media"}], "media"),
            ("medias", [{"download_url": "download"}], "download"),
            ("streams", [{"url": "stream"}], "stream"),
            ("links", ["link"], "link"),
            ("links", [{"url": "object"}], "object"),
            ("medias", [], None),
        ]
        for key, value, expected in shapes:
            with (
                self.subTest(key=key, value=value),
                patch.object(api, "get_cache", return_value=(None, "miss")),
                patch.object(api, "extract_metadata", return_value={key: value}),
                patch.object(api, "set_cache") as save,
            ):
                response = self.client.post("/api/v1/generic/download", json={"url": URL})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.get_json()["result"].get("url"), expected)
                save.assert_called_once()
        with patch.object(api, "get_cache", return_value=({"url": URL}, "memory")):
            self.assertEqual(
                self.client.post("/extract", json={"url": URL, "platform": "generic"}).status_code,
                200,
            )

    def test_waiting_extraction_uses_cache_recheck(self):
        with (
            patch.object(api, "get_cache", side_effect=[(None, "miss"), ({"url": URL}, "redis")]),
            patch.object(api, "extract_metadata") as extract,
        ):
            response = self.client.get("/extract?url=" + URL)
        self.assertTrue(response.get_json()["cached"])
        extract.assert_not_called()

    def test_extractor_errors_have_stable_json_codes(self):
        for error, status, code in (
            (security.SecurityValidationError("blocked"), 400, "invalid_url"),
            (ValueError("invalid"), 400, "extract_failed"),
            (downloader.UpstreamBlocked("media"), 415, "blocked_content_type"),
            (RuntimeError("private details"), 500, "internal_error"),
        ):
            with (
                self.subTest(code=code),
                patch.object(api, "get_cache", return_value=(None, "miss")),
                patch.object(api, "extract_metadata", side_effect=error),
                patch.object(api, "set_cache") as save,
            ):
                response = self.client.get("/extract?url=" + URL)
            self.assertEqual(response.status_code, status)
            self.assertEqual(response.get_json()["code"], code)
            save.assert_not_called()

    def test_readiness_and_metrics_disabled_and_unhandled_failure(self):
        with patch.object(api, "redis_health", return_value={"ok": False}):
            self.assertEqual(self.client.get("/readiness").status_code, 503)
        with (
            patch.object(api, "redis_health", return_value={"ok": True}),
            patch.object(Config, "REQUIRE_PROXY", True),
            patch.object(Config, "PROXY_URL", ""),
        ):
            self.assertEqual(self.client.get("/readiness").status_code, 503)
        with patch.object(Config, "METRICS_ENABLED", False):
            self.assertEqual(self.client.get("/metrics").get_json()["code"], "metrics_disabled")
        with patch.object(api, "redis_health", side_effect=RuntimeError("private details")):
            response = self.client.get("/readiness")
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("private details", response.get_data(as_text=True))

    def test_forwarded_client_ip(self):
        with api.app.test_request_context("/", headers={"X-Forwarded-For": " 8.8.8.8, 1.1.1.1"}):
            self.assertEqual(_client_ip(), "8.8.8.8")

    def test_metrics_cache_accounting(self):
        metrics = Metrics()
        metrics.record_cache_miss()
        metrics.record_cache_hit("redis", 1024)
        metrics.record_cache_hit("unknown", -20)
        metrics.record_cache_hit("memory", None)
        report = metrics.get_report()
        self.assertEqual(report["redis_hit_rate"], 0.5)
        self.assertEqual(report["memory_cache_hit_rate"], 0.5)
        self.assertEqual(report["proxy_bandwidth_saved_bytes_due_to_caching"], 1024)

    def test_proxy_selection_and_cleanup(self):
        session = proxy._create_session("http://proxy.test")
        self.addCleanup(session.close)
        self.assertEqual(session.proxies["https"], "http://proxy.test")
        direct, proxied = Mock(), Mock()
        with (
            patch.object(proxy, "direct_session", direct),
            patch.object(proxy, "proxy_session", proxied),
        ):
            self.assertIs(proxy.session_for_proxy(True), proxied)
            self.assertIs(proxy.session_for_proxy(False), direct)
            proxy.close_session()
            direct.close.assert_called_once()
            proxied.close.assert_called_once()
