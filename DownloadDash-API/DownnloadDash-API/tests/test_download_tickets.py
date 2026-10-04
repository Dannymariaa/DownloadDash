import hashlib
import hmac
import time
from unittest.mock import AsyncMock

import pytest
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.main import app
from app.models.platform_requests import FacebookDownloadIn


def signed_params(secret='test-download-key', expires=None):
    params = {'url': 'https://www.youtube.com/watch?v=jNQXAC9IVRw', 'variant': 'hd',
              'expires': str(expires if expires is not None else int(time.time()) + 300)}
    message = '\n'.join(['v1', 'GET', '/youtube/file', params['expires'], params['url'], params['variant']])
    params['signature'] = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()
    return params


def test_signed_browser_download_is_authorized_without_exposing_api_key(monkeypatch):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    async def file_response(*args, **kwargs):
        return JSONResponse({'authorized': True})
    route = next(r for r in app.routes if getattr(r, 'path', None) == '/youtube/file')
    monkeypatch.setattr(route.dependant, 'call', file_response)
    response = TestClient(app).get('/youtube/file', params=signed_params())
    assert response.status_code == 200
    assert response.json() == {'authorized': True}


@pytest.mark.parametrize('change', [
    {'variant': 'audio'}, {'url': 'https://www.youtube.com/watch?v=changed'},
    {'signature': '0' * 64}, {'expires': '0'}, {'expires': 'invalid'},
])
def test_modified_tickets_are_rejected(monkeypatch, change):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    params = signed_params()
    params.update(change)
    assert TestClient(app).get('/youtube/file', params=params).status_code == 403


@pytest.mark.parametrize('expiry_offset', [-1, 600])
def test_expired_or_overlong_tickets_are_rejected(monkeypatch, expiry_offset):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    response = TestClient(app).get('/youtube/file', params=signed_params(expires=int(time.time()) + expiry_offset))
    assert response.status_code == 403


def test_tickets_cannot_authorize_other_routes_or_duplicate_parameters(monkeypatch):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    client = TestClient(app)
    params = signed_params()
    assert client.get('/download/file', params=params).status_code == 403
    assert client.post('/youtube/file', params=params).status_code == 403
    assert client.get('/youtube/file', params=list(params.items()) + [('variant', 'audio')]).status_code == 403


def test_facebook_named_page_video_url_is_accepted():
    FacebookDownloadIn(url='https://www.facebook.com/NASAEarthData/videos/new-nasadem-is-here/221831485672197/')


@pytest.mark.parametrize('url', ['http://127.0.0.1/video', 'https://www.instagram.com/p/abc/', 'file:///etc/passwd'])
def test_youtube_file_rejects_unsafe_and_other_platform_sources(monkeypatch, url):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    async def unexpected(*args, **kwargs):
        pytest.fail('unsafe file source reached extractor')
    monkeypatch.setattr('app.routers.youtube.public_downloader.resolve_media', unexpected)
    response = TestClient(app).get('/youtube/file', params={'url': url}, headers={'X-DownloadDash-Key': 'test-download-key'})
    assert response.status_code == 400


@pytest.mark.parametrize('message,code', [('security challenge', 'ANTI_BOT_CHALLENGE'), ('login required', 'COOKIE_REQUIRED'),
                                         ('private media', 'PRIVATE_MEDIA')])
def test_signed_file_stops_on_terminal_restriction(monkeypatch, message, code):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    monkeypatch.setattr('app.routers.youtube.public_downloader.resolve_media', AsyncMock(side_effect=RuntimeError(message)))
    download = AsyncMock(side_effect=RuntimeError('unexpected heavy request'))
    monkeypatch.setattr('app.routers.youtube.public_downloader.download_youtube_variant', download)
    response = TestClient(app).get('/youtube/file', params=signed_params())
    assert response.status_code in {401, 403}
    assert code in response.text
    download.assert_not_awaited()


def test_signed_file_does_not_disclose_raw_provider_errors(monkeypatch):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    monkeypatch.setattr('app.routers.youtube.public_downloader.resolve_media', AsyncMock(return_value={}))
    monkeypatch.setattr('app.routers.youtube.public_downloader.download_youtube_variant',
                        AsyncMock(side_effect=RuntimeError('provider error token=sensitive-value https://user:password@upstream.example/')))
    response = TestClient(app).get('/youtube/file', params=signed_params())
    assert response.status_code == 502
    assert 'sensitive-value' not in response.text
    assert 'password' not in response.text
