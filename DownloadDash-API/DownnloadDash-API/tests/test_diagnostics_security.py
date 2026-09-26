import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_provider_diagnostics_redacts_cookie_proxy_and_auth_details(monkeypatch, tmp_path):
    monkeypatch.setenv("DOWNLOADDASH_API_KEY", "test-downloaddash-key")
    cookiefile = tmp_path / "x-cookies-secret.txt"
    cookiefile.write_text(
        "# Netscape HTTP Cookie File\n"
        ".x.com\tTRUE\t/\tTRUE\t4102444800\tauth_token\tsecret-cookie-value\n",
        encoding="utf-8",
    )

    class PublicDownloaderStub:
        proxy_urls = {
            "x": "http://proxy-user:proxy-pass@proxy.example:8080",
            "default": "http://default-user:default-pass@proxy.example:8080",
        }

        def _cookiefile_for_url(self, _url):
            return str(cookiefile)

        def _build_http_headers(self, _url):
            return {"Authorization": "Bearer should-not-leak"}

    class GalleryDownloaderStub:
        proxy_urls = {"x": "socks5://gallery-user:gallery-pass@proxy.example:1080"}
        cookiefiles = {"x": str(cookiefile)}

    async def resolver_failure(**_kwargs):
        raise RuntimeError(
            "Authorization: Bearer should-not-leak "
            "cookie=secret-cookie-value "
            "cookiefile_path=x-cookies-secret.txt "
            "https://proxy-user:proxy-pass@proxy.example/private"
        )

    class UniversalDownloaderStub:
        resolve_media = staticmethod(resolver_failure)

    monkeypatch.setattr("app.routers.diagnostics.public_downloader", PublicDownloaderStub())
    monkeypatch.setattr("app.routers.diagnostics.gallery_downloader", GalleryDownloaderStub())
    monkeypatch.setattr("app.routers.diagnostics.universal_downloader", UniversalDownloaderStub())

    response = TestClient(app).get(
        "/diagnostics/provider",
        params={
            "platform": "x",
            "url": "https://x.com/user/status/123",
            "run_resolver": "true",
        },
        headers={"X-DownloadDash-Key": "test-downloaddash-key"},
    )

    assert response.status_code == 200
    body = response.json()
    encoded = json.dumps(body)

    assert body["platform"] == "x"
    assert body["cookiesConfigured"] is True
    assert body["cookieCount"] == 1
    assert body["proxyConfigured"] is True
    assert body["resolver"]["errorCode"] in {
        "COOKIE_REQUIRED",
        "LOGIN_REQUIRED",
        "PRIVATE_MEDIA",
        "PLATFORM_BLOCKED_PROXY",
        "EXTRACTOR_FAILED",
    }
    assert "cookie=<redacted>" in body["resolver"]["sanitizedFailure"]
    assert "cookiefile_path=<redacted>" in body["resolver"]["sanitizedFailure"]
    assert "https://<redacted>:<redacted>@proxy.example/private" in body["resolver"]["sanitizedFailure"]

    for secret in (
        "secret-cookie-value",
        "x-cookies-secret.txt",
        str(cookiefile),
        "proxy-user",
        "proxy-pass",
        "gallery-user",
        "gallery-pass",
        "should-not-leak",
        "Bearer should-not-leak",
    ):
        assert secret not in encoded
