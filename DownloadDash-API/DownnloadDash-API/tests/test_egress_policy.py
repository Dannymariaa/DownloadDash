import asyncio
import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.platforms.egress import EgressPolicy, ProxyMetrics, MetadataTransport, cache_ttl
from app.models.schemas import Platform


def test_direct_success_never_spends_proxy_bytes():
    async def run():
        proxy = AsyncMock()
        result = await EgressPolicy().resolve('youtube', AsyncMock(return_value={'direct_url': 'https://cdn.example/a'}), proxy)
        proxy.assert_not_called()
        assert result['egress']['proxyTotalBytes'] == 0
        assert result['egress']['route'] == 'direct'
    asyncio.run(run())


@pytest.mark.parametrize('error', ['INVALID_URL', 'MEDIA_NOT_FOUND', 'LOGIN_REQUIRED', 'COOKIE_REQUIRED',
    'ANTI_BOT_CHALLENGE', 'PRIVATE_MEDIA', 'UNSUPPORTED_MEDIA', '403 private post', '403 CAPTCHA',
    '403 login required', '404 not found', 'paid content', 'PROXY_AUTH_FAILED',
    '407 Proxy Authentication Required', 'This account is temporarily locked; log in to unlock your account'])
def test_restrictions_never_fallback(error):
    async def run():
        proxy = AsyncMock()
        with pytest.raises(Exception):
            await EgressPolicy().resolve('reddit', AsyncMock(side_effect=RuntimeError(error)), proxy)
        proxy.assert_not_called()
    asyncio.run(run())


def test_eligible_failure_uses_exactly_one_attempt_and_counts_failure():
    async def run():
        proxy = AsyncMock(side_effect=RuntimeError('proxy quota exhausted'))
        policy = EgressPolicy()
        for _ in range(3):
            with pytest.raises(Exception):
                await policy.resolve('reddit', AsyncMock(side_effect=RuntimeError('HTTP Error 403: Forbidden')), proxy)
        assert proxy.await_count == 1
        assert policy.snapshot()['reddit']['proxyCircuitOpen'] is True
        # Direct success remains usable while the proxy circuit is open.
        result = await policy.resolve('reddit', AsyncMock(return_value={'direct_url': 'ok'}), proxy)
        assert result['egress']['route'] == 'direct'
    asyncio.run(run())


def test_proxy_success_is_cached_and_single_flight_precedes_proxy(monkeypatch):
    from app.api import shared
    from app.models.schemas import DownloadRequest, Quality
    async def run():
        shared._resolve_cache.clear()
        shared._resolve_inflight.clear()
        monkeypatch.setattr(shared, 'egress_policy', EgressPolicy())
        direct = AsyncMock(side_effect=RuntimeError('HTTP Error 403: Forbidden'))
        async def fallback(url, quality, extract_audio, metrics):
            await asyncio.sleep(0.01)
            metrics.proxyRequestCount += 1
            metrics.proxyDownloadBytes += 1200
            return {'direct_url': 'https://i.redd.it/photo.jpg', 'kind': 'image'}
        proxy = AsyncMock(side_effect=fallback)
        monkeypatch.setattr(shared.universal_downloader, 'resolve_media', direct)
        monkeypatch.setattr(shared.public_downloader, 'resolve_proxy_metadata', proxy)
        monkeypatch.setattr(shared.public_downloader, '_proxy_for_url', lambda url: 'http://proxy.test')
        req = DownloadRequest(url='https://www.reddit.com/gallery/abc123', platform=Platform.REDDIT, quality=Quality.HIGH)
        results = await asyncio.gather(*(shared._resolve_public_metadata(platform=Platform.REDDIT, request=req, cache_key='egress') for _ in range(100)))
        cached = await shared._resolve_public_metadata(platform=Platform.REDDIT, request=req, cache_key='egress')
        assert direct.await_count == proxy.await_count == 1
        assert all(r[1] is None for r in results)
        assert cached[2] is True
        assert cached[0]['egress']['proxyTotalBytes'] == 0
        assert cached[0]['egress']['proxyCacheHit'] is True
        assert sum(r[0]['egress']['proxyTotalBytes'] for r in results) == 1200
    asyncio.run(run())


def test_meter_counts_compressed_payload_and_reuses_transport_without_media_bodies():
    import gzip
    payload = gzip.compress(b'{"public":true}')
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(200, headers={'Content-Type': 'application/json', 'Content-Encoding': 'gzip'}, stream=httpx.ByteStream(payload))
    metrics = ProxyMetrics()
    with MetadataTransport('http://proxy.test', metrics, transport=httpx.MockTransport(respond)) as client:
        response = client.request('https://www.reddit.com/comments/abc.json', data=b'hello', method='POST')
        assert response.read() == b'{"public":true}'
        with pytest.raises(ValueError, match='media'):
            client.request('https://v.redd.it/a/video.mp4')
    assert len(requests) == metrics.proxyRequestCount == 1
    assert metrics.proxyUploadBytes == 5
    assert metrics.proxyDownloadBytes == len(payload)


def test_media_content_type_is_closed_without_consuming_body():
    class UnreadBody(httpx.SyncByteStream):
        def __iter__(self):
            pytest.fail('proxy read a media body')
            yield b''
    metrics = ProxyMetrics()
    with MetadataTransport('http://proxy.test', metrics, transport=httpx.MockTransport(
        lambda request: httpx.Response(200, headers={'Content-Type': 'video/mp4'}, stream=UnreadBody())
    )) as client:
        with pytest.raises(ValueError, match='media'):
            client.request('https://www.reddit.com/extensionless')
    assert metrics.proxyDownloadBytes == 0


def test_signed_expiry_caps_cache_and_secret_fields_are_removed():
    from app.platforms.egress import public_metadata
    assert cache_ttl({'url': 'https://cdn.example/a?expire=1050'}, now=1000) == 40
    assert cache_ttl({'url': 'https://cdn.example/a?expire=990'}, now=1000) == 0
    cleaned = public_metadata({'cookies': 'secret', 'formats': [{'http_headers': {'Cookie': 'secret', 'Authorization': 'secret', 'Referer': 'public'}}]})
    assert 'secret' not in json.dumps(cleaned)


def test_download_options_are_direct_even_when_proxy_configured():
    from app.platforms.public_platforms import PublicPlatformDownloader
    from app.platforms.gallery_dl_downloader import GalleryDLDownloader
    from tempfile import TemporaryDirectory
    downloader = PublicPlatformDownloader(proxy_urls={'default': 'http://expensive.test'}, youtube_proxy_url='http://expensive.test')
    assert downloader._apply_proxy_for_url({}, 'https://www.reddit.com/gallery/abc')['proxy'] == ''
    assert all(not profile[3] for profile in downloader._youtube_client_profiles())
    with TemporaryDirectory() as tmp:
        command = GalleryDLDownloader(tmp, proxy_url='http://expensive.test')._base_command('https://www.reddit.com/gallery/abc')
        assert 'proxy=' in command and not any('expensive' in arg for arg in command)


def test_managed_youtube_download_cannot_select_proxy_profile(monkeypatch, tmp_path):
    from app.platforms.public_platforms import PublicPlatformDownloader
    public = PublicPlatformDownloader(download_path=str(tmp_path), youtube_proxy_url='http://expensive.test')
    monkeypatch.setenv('HTTPS_PROXY', 'http://expensive.test')
    monkeypatch.setattr(public, '_youtube_client_profiles', lambda: [('unexpected', None, False, True)])
    options = []
    class Downloader:
        def __init__(self, opts):
            options.append(opts)
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def extract_info(self, *args, **kwargs): raise RuntimeError('PRIVATE_MEDIA')
    monkeypatch.setattr('app.platforms.public_platforms.yt_dlp.YoutubeDL', Downloader)
    with pytest.raises(Exception):
        asyncio.run(public.download_youtube_variant('https://www.youtube.com/watch?v=example'))
    assert options and all(opts['proxy'] == '' for opts in options)
    assert all(opts['external_downloader_args']['ffmpeg_i'] == ['-http_proxy', ''] for opts in options)


def test_metered_extractor_normalizes_and_caches_public_formats(monkeypatch, tmp_path):
    from app.platforms.public_platforms import PublicPlatformDownloader
    from app.models.schemas import Quality
    from yt_dlp.networking.common import Request
    public = PublicPlatformDownloader(download_path=str(tmp_path), youtube_proxy_url='http://user:secret@proxy.test')
    metrics = ProxyMetrics()
    original = httpx.Client
    monkeypatch.setattr('app.platforms.egress.httpx.Client', lambda **kwargs: original(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, headers={'content-type': 'application/json'},
            stream=httpx.ByteStream(b'{}'))), trust_env=False))
    class Extractor:
        def __init__(self, opts):
            assert not opts.get('cookiefile')
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def extract_info(self, url, download):
            assert download is False
            assert self.urlopen(Request(url)).read() == b'{}'
            return {'title': 'Public', 'formats': [{'url': 'https://r1.googlevideo.com/public', 'ext': 'mp4',
                'vcodec': 'h264', 'acodec': 'aac', 'height': 360, 'http_headers': {'Cookie': 'secret'}}]}
    monkeypatch.setattr('app.platforms.public_platforms.yt_dlp.YoutubeDL', Extractor)
    url = 'https://www.youtube.com/watch?v=example'
    result = asyncio.run(public.resolve_proxy_metadata(url, Quality.HIGH, False, metrics))
    assert result['downloads']['videoHD'].startswith('/youtube/file?')
    assert metrics.proxyRequestCount == 1 and metrics.proxyDownloadBytes == 2
    assert 'secret' not in json.dumps(public.get_resolved_media(url))


def test_proxy_redirect_cannot_escape_public_hosts():
    seen = []
    def redirect(req):
        seen.append(req)
        return httpx.Response(302, headers={'location': 'http://169.254.169.254/latest/meta-data/'})
    with MetadataTransport('http://proxy.test', ProxyMetrics(), transport=httpx.MockTransport(redirect)) as client:
        with pytest.raises(ValueError, match='host'):
            client.request('https://www.reddit.com/comments/example.json')
    assert len(seen) == 1


def test_proxy_attempt_does_not_start_after_resolution_deadline():
    async def run():
        proxy = AsyncMock()
        with pytest.raises(RuntimeError):
            await EgressPolicy(clock=lambda: 10).resolve('reddit',
                AsyncMock(side_effect=RuntimeError('HTTP 403')), proxy, deadline=5)
        proxy.assert_not_called()
    asyncio.run(run())


def test_provider_restrictions_do_not_open_infrastructure_breaker():
    async def run():
        policy = EgressPolicy()
        for _ in range(3):
            with pytest.raises(RuntimeError):
                await policy.resolve('youtube', AsyncMock(side_effect=RuntimeError('HTTP 403')),
                    AsyncMock(side_effect=RuntimeError('ANTI_BOT_CHALLENGE')))
        assert policy.snapshot()['youtube']['proxyCircuitOpen'] is False
    asyncio.run(run())


@pytest.mark.parametrize('extension', ['mp4', 'mp3', 'jpg', 'm3u8', 'mpd'])
def test_metadata_transport_never_requests_media_or_manifests(extension):
    with MetadataTransport('http://proxy.test', ProxyMetrics(), transport=httpx.MockTransport(
        lambda req: pytest.fail('proxy contacted media route')
    )) as client:
        with pytest.raises(ValueError, match='media'):
            client.request('https://www.youtube.com/asset.' + extension)
