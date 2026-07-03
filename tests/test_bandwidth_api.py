import json
import requests
import threading
import time
import unittest
from unittest.mock import Mock, patch

import app as api
import cache
import downloader
import proxy
from config import Config
from downloader import _is_allowed_content_type, _parse_metadata
from locks import LockManager
from rate_limit import reset_rate_limits
from scripts.benchmark_api_local import run as run_api_benchmark
from scripts.benchmark_platform_bandwidth import run_benchmark
from security import SecurityValidationError, validate_public_url


class BandwidthApiTests(unittest.TestCase):
    def setUp(self):
        reset_rate_limits()
        api.app.config["TESTING"] = True

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

    def test_security_rejects_internal_urls(self):
        blocked = [
            "ftp://example.com",
            "http://localhost/test",
            "http://127.0.0.1/test",
            "http://169.254.169.254/latest/meta-data",
            "https://user:pass@example.com/path",
            "https://example.com/\nHeader: injected",
        ]
        for url in blocked:
            with self.subTest(url=url):
                with self.assertRaises(SecurityValidationError):
                    validate_public_url(url)

    def test_security_rejects_dns_rebinding_targets(self):
        with patch("security.socket.getaddrinfo") as getaddrinfo:
            getaddrinfo.return_value = [(None, None, None, None, ("10.0.0.1", 0))]
            with self.assertRaises(SecurityValidationError):
                validate_public_url("https://public.example/path")

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

        with patch.object(api, "validate_public_url", return_value="https://example.test/post"), patch.object(
            api, "get_cache", return_value=(cached, "memory")
        ), patch.object(api, "extract_metadata", side_effect=fake_extract_metadata):
            client = api.app.test_client()
            response = client.get("/extract?url=https://example.test/post")

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.data)
        self.assertTrue(payload["cached"])
        self.assertEqual(payload["result"]["metadata"]["title"], "Cached")
        self.assertFalse(called["network"])
        self.assertIn("X-Request-ID", response.headers)

    def test_v1_extract_and_correlation_id(self):
        cached = {"platform": "generic", "metadata": {"title": "Cached"}}
        with patch.object(api, "validate_public_url", return_value="https://example.test/post"), patch.object(
            api, "get_cache", return_value=(cached, "memory")
        ):
            client = api.app.test_client()
            response = client.get(
                "/api/v1/extract?url=https://example.test/post",
                headers={"X-Correlation-ID": "corr-123"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["X-Correlation-ID"], "corr-123")

    def test_extract_rejects_platform_mismatch(self):
        with patch.object(api, "validate_public_url", return_value="https://youtu.be/example"):
            client = api.app.test_client()
            response = client.get("/extract?url=https://youtu.be/example&platform=tiktok")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["code"], "platform_mismatch")

    def test_error_handlers_return_json(self):
        client = api.app.test_client()
        response = client.get("/missing")
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.get_json()["success"])

    def test_health_liveness_and_readiness(self):
        client = api.app.test_client()
        self.assertEqual(client.get("/health").status_code, 200)
        self.assertEqual(client.get("/liveness").status_code, 200)
        with patch.object(api, "redis_health", return_value={"ok": True, "configured": True, "latency_ms": 1}):
            response = client.get("/readiness")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])

    def test_metrics_prometheus_and_json(self):
        client = api.app.test_client()
        text_response = client.get("/metrics")
        self.assertEqual(text_response.status_code, 200)
        metrics_text = text_response.get_data(as_text=True)
        self.assertIn("downloaddash_api_requests_total", metrics_text)
        self.assertIn("downloaddash_upstream_failures_total", metrics_text)
        self.assertIn("downloaddash_process_uptime_seconds", metrics_text)

        json_response = client.get("/metrics", headers={"Accept": "application/json"})
        self.assertEqual(json_response.status_code, 200)
        self.assertIn("api_requests", json_response.get_json())

    def test_openapi_and_docs(self):
        client = api.app.test_client()
        spec = client.get("/api/v1/openapi.json")
        self.assertEqual(spec.status_code, 200)
        self.assertIn("/api/v1/extract", spec.get_json()["paths"])

        docs = client.get("/api/v1/docs")
        self.assertEqual(docs.status_code, 200)
        self.assertIn("SwaggerUIBundle", docs.get_data(as_text=True))

    def test_rate_limit_returns_structured_json(self):
        client = api.app.test_client()
        with patch.object(Config, "RATE_LIMIT_PER_IP", 1), patch.object(
            api, "validate_public_url", return_value="https://example.com/post"
        ), patch.object(api, "get_cache", return_value=({"platform": "generic", "metadata": {}}, "memory")):
            self.assertEqual(client.get("/extract?url=https://example.com/post").status_code, 200)
            response = client.get("/extract?url=https://example.com/post")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.get_json()["code"], "rate_limit_exceeded")

    def test_cache_pack_unpack_and_memory_lru(self):
        payload = {"platform": "generic", "metadata": {"title": "A"}}
        packed = cache._pack(payload)
        self.assertIsInstance(packed, bytes)
        self.assertEqual(cache._unpack(packed), payload)

        lru = cache.MemoryLRU(maxsize=1, ttl=60)
        lru.set("one", "1")
        lru.set("two", "2")
        self.assertIsNone(lru.get("one"))
        self.assertEqual(lru.get("two"), "2")

    def test_cache_rejects_oversized_compressed_payload(self):
        payload = {"data": "x" * 128}
        packed = cache._pack(payload)
        with patch.object(Config, "MAX_CACHE_PAYLOAD_BYTES", 16):
            with self.assertRaises(ValueError):
                cache._unpack(packed)

    def test_lock_manager_serializes_same_url(self):
        manager = LockManager()
        order = []

        def worker(name):
            with manager.lock_for("https://example.com/same"):
                order.append(f"start-{name}")
                time.sleep(0.01)
                order.append(f"end-{name}")

        threads = [threading.Thread(target=worker, args=(index,)) for index in (1, 2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertIn(order, (["start-1", "end-1", "start-2", "end-2"], ["start-2", "end-2", "start-1", "end-1"]))

    def test_proxy_session_configuration(self):
        adapter = proxy.session.get_adapter("https://example.com")
        self.assertTrue(proxy.session.verify)
        self.assertEqual(adapter._pool_connections, Config.CONNECTION_POOL_CONNECTIONS)
        self.assertEqual(adapter._pool_maxsize, Config.CONNECTION_POOL_MAXSIZE)
        self.assertEqual(proxy.session.headers["Connection"], "keep-alive")

    def test_config_validation_rejects_invalid_pool_sizes(self):
        original = Config.CONNECTION_POOL_MAXSIZE
        try:
            Config.CONNECTION_POOL_MAXSIZE = 0
            with self.assertRaises(ValueError):
                Config.validate()
        finally:
            Config.CONNECTION_POOL_MAXSIZE = original
            Config.validate()

    def test_dockerfile_uses_non_root_user(self):
        with open("Dockerfile", encoding="utf-8") as handle:
            dockerfile = handle.read()
        self.assertIn("USER appuser", dockerfile)
        self.assertIn("HEALTHCHECK", dockerfile)

    def test_benchmark_reports_platform_bytes_and_requests(self):
        sample_result = {
            "platform": "youtube",
            "metadata": {"title": "Sample"},
        }
        snapshots = [
            {"upstream_requests": 2, "total_bytes": 1000, "average_latency_ms_per_upstream_request": 10},
            {"upstream_requests": 4, "total_bytes": 5096, "average_latency_ms_per_upstream_request": 20},
        ]

        with patch(
            "scripts.benchmark_platform_bandwidth.extract_metadata",
            return_value=sample_result,
        ), patch(
            "scripts.benchmark_platform_bandwidth.metrics.get_report",
            side_effect=snapshots,
        ):
            results = run_benchmark([("youtube", "https://youtu.be/example")])

        self.assertEqual(results[0]["platform"], "youtube")
        self.assertEqual(results[0]["requests"], 2)
        self.assertEqual(results[0]["bytes_downloaded"], 4096)
        self.assertEqual(results[0]["kb_downloaded"], 4.0)
        self.assertTrue(results[0]["cacheable"])
        self.assertTrue(results[0]["success"])

    def test_api_benchmark_reports_cold_and_warm(self):
        results = run_api_benchmark(2)
        self.assertIn("cold_cache", results)
        self.assertIn("warm_cache", results)
        self.assertEqual(results["cold_cache"]["cache_hit_ratio"], 0)
        self.assertEqual(results["warm_cache"]["cache_hit_ratio"], 1)

    def test_concurrent_cached_requests_do_not_hit_network(self):
        client = api.app.test_client()
        cached = {"platform": "generic", "metadata": {"title": "Hot"}}
        network = Mock()

        with patch.object(api, "validate_public_url", return_value="https://example.com/hot"), patch.object(
            api, "get_cache", return_value=(cached, "memory")
        ), patch.object(api, "extract_metadata", side_effect=network):
            responses = []

            def call():
                responses.append(client.get("/extract?url=https://example.com/hot").status_code)

            threads = [threading.Thread(target=call) for _ in range(5)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()

        self.assertEqual(responses, [200, 200, 200, 200, 200])
        network.assert_not_called()

    def test_upstream_timeout_records_failure(self):
        before = api.metrics.get_report()["upstream_failures"]
        with patch.object(downloader.session, "request", side_effect=requests.Timeout("timeout")):
            with self.assertRaises(requests.Timeout):
                downloader._request("HEAD", "https://example.com", "generic")
        after = api.metrics.get_report()["upstream_failures"]
        self.assertEqual(after, before + 1)

    def test_large_html_response_is_capped(self):
        class FakeResponse:
            status_code = 200
            headers = {"Content-Type": "text/html", "Content-Length": "999999"}

            def iter_content(self, chunk_size, decode_unicode=False):
                yield b"<html><head>" + (b"x" * 1024)

            def close(self):
                self.closed = True

        fake = FakeResponse()
        with patch.object(Config, "MAX_HTML_BYTES", 32), patch.object(
            downloader, "_request", return_value=(fake, time.monotonic(), 0, 200, 0, False)
        ):
            metadata = downloader._get_partial_metadata("https://example.com", "generic")

        self.assertEqual(metadata["body_bytes_read"], 32)


if __name__ == "__main__":
    unittest.main()
