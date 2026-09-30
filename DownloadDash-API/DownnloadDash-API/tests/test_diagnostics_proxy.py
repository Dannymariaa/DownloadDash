import asyncio
import socket
import unittest
from unittest.mock import patch

from app.routers.diagnostics import _probe_direct_http, _probe_proxy


class FakeResponse:
    def __init__(self, status_code):
        self.status_code = status_code


class FakeAsyncClient:
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return None

    async def get(self, _url):
        return FakeResponse(204)


class ProxyDiagnosticsTests(unittest.TestCase):
    def test_proxy_probe_reports_dns_tcp_and_http_without_credentials(self):
        class FakeSocket:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return None

        proxy = "http://account:secret@proxy.example:8123"
        with patch("app.routers.diagnostics.socket.getaddrinfo", return_value=[("address",)]), \
             patch("app.routers.diagnostics.socket.create_connection", return_value=FakeSocket()) as connect, \
             patch("app.routers.diagnostics.httpx.AsyncClient", FakeAsyncClient):
            result = asyncio.run(_probe_proxy(proxy))

        self.assertEqual(connect.call_args.args[0], ("proxy.example", 8123))
        self.assertTrue(result["configured"])
        self.assertTrue(result["dnsReachable"])
        self.assertTrue(result["tcpReachable"])
        self.assertTrue(result["reachable"])
        self.assertTrue(result["authAccepted"])
        self.assertEqual(result["status"], 204)
        self.assertEqual(result["quotaOrPlan"], "NOT_EXPOSED_BY_PROBE")
        self.assertNotIn("account", str(result))
        self.assertNotIn("secret", str(result))

    def test_proxy_probe_reports_explicit_auth_rejection(self):
        class RejectedClient(FakeAsyncClient):
            async def get(self, _url):
                return FakeResponse(407)

        class FakeSocket:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return None

        with patch("app.routers.diagnostics.socket.getaddrinfo", return_value=[("address",)]), \
             patch("app.routers.diagnostics.socket.create_connection", return_value=FakeSocket()), \
             patch("app.routers.diagnostics.httpx.AsyncClient", RejectedClient):
            result = asyncio.run(_probe_proxy("http://proxy.example:8123"))

        self.assertFalse(result["authAccepted"])
        self.assertEqual(result["status"], 407)

    def test_proxy_dns_failure_is_reported_without_echoing_proxy_url(self):
        proxy = "http://account:secret@missing.invalid:8123"
        with patch("app.routers.diagnostics.socket.getaddrinfo", side_effect=socket.gaierror):
            result = asyncio.run(_probe_proxy(proxy))

        self.assertFalse(result["dnsReachable"])
        self.assertFalse(result["tcpReachable"])
        self.assertNotIn("missing.invalid", str(result))
        self.assertNotIn("secret", str(result))

    def test_direct_render_http_probe_reports_status(self):
        with patch("app.routers.diagnostics.httpx.AsyncClient", FakeAsyncClient):
            result = asyncio.run(_probe_direct_http())
        self.assertEqual(result, {"reachable": True, "status": 204})


if __name__ == "__main__":
    unittest.main()
