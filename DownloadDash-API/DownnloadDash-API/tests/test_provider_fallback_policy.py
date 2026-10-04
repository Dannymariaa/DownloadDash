import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.models.schemas import Quality, Platform, DownloadRequest
from app.platforms.public_platforms import PublicPlatformDownloader
from app.platforms.universal_downloader import UniversalMediaDownloader
from fastapi import BackgroundTasks
from app.models.platform_requests import YouTubeDownloadIn
from app.routers.youtube import download_youtube
from app.api import shared


@pytest.mark.parametrize('provider', ['facebook', 'instagram'])
@pytest.mark.parametrize('message', ['security challenge', 'login required', 'private media', 'media not found'])
def test_terminal_provider_errors_do_not_start_more_requests(provider, message):
    public = PublicPlatformDownloader()
    public.resolve_media = AsyncMock(side_effect=RuntimeError(message))
    public.facebook_fallback_urls = Mock(return_value=['https://www.facebook.com/reel/123'])
    public._fallback_opengraph = AsyncMock(return_value=None)
    universal = UniversalMediaDownloader(public)
    universal._resolve_instagram_post = AsyncMock(return_value=None)
    universal._resolve_instagram_fallbacks = AsyncMock(return_value=None)

    async def run():
        if provider == 'facebook':
            return await universal._resolve_facebook('https://www.facebook.com/reel/123', Quality.HIGH, False)
        return await universal._resolve_instagram('https://www.instagram.com/p/abc/', Quality.HIGH, False, None, None)

    with pytest.raises(RuntimeError, match=message):
        asyncio.run(run())
    public.resolve_media.assert_awaited_once()
    public._fallback_opengraph.assert_not_awaited()
    universal._resolve_instagram_fallbacks.assert_not_awaited()


def test_instagram_does_not_repeat_failed_public_resolution():
    public = PublicPlatformDownloader()
    public.resolve_media = AsyncMock(side_effect=RuntimeError('extractor failed'))
    universal = UniversalMediaDownloader(public)
    universal._resolve_instagram_post = AsyncMock(return_value=None)
    universal._resolve_instagram_fallbacks = AsyncMock(return_value=None)
    with pytest.raises(RuntimeError, match='extractor failed'):
        asyncio.run(universal._resolve_instagram('https://www.instagram.com/p/abc/', Quality.HIGH, False, None, None))
    public.resolve_media.assert_awaited_once()


def test_youtube_route_uses_metadata_cache_and_single_flight(monkeypatch):
    shared._resolve_cache.clear()
    shared._resolve_inflight.clear()
    async def metadata(**kwargs):
        await asyncio.sleep(0.01)
        return {'direct_url': '/youtube/file?url=https%3A%2F%2Fyoutu.be%2FjNQXAC9IVRw&variant=hd',
                'title': 'Test video', 'kind': 'video', 'downloads': {'videoHD': '/youtube/file?variant=hd'}}
    resolver = AsyncMock(side_effect=metadata)
    monkeypatch.setattr(shared.universal_downloader, 'resolve_media', resolver)
    async def run():
        body = YouTubeDownloadIn(url='https://youtu.be/jNQXAC9IVRw')
        responses = await asyncio.gather(*(download_youtube(body, BackgroundTasks()) for _ in range(10)))
        assert all(r.success for r in responses)
        await download_youtube(body, BackgroundTasks())
    try:
        asyncio.run(run())
        resolver.assert_awaited_once()
    finally:
        shared._resolve_cache.clear()
        shared._resolve_inflight.clear()


def test_metadata_extraction_does_not_multiply_provider_retries(monkeypatch):
    captured = []
    class Extractor:
        def __init__(self, opts):
            captured.append(opts)
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def extract_info(self, url, download=False):
            assert download is False
            return {'title': 'video', 'url': 'https://cdn.example/video.mp4', 'ext': 'mp4',
                    'formats': [{'url': 'https://cdn.example/video.mp4', 'ext': 'mp4', 'vcodec': 'h264', 'acodec': 'aac'}]}
    monkeypatch.setattr('app.platforms.public_platforms.yt_dlp.YoutubeDL', Extractor)
    asyncio.run(PublicPlatformDownloader().resolve_media('https://youtu.be/jNQXAC9IVRw', Quality.HIGH))
    assert captured
    for opts in captured:
        assert opts['skip_download'] is True
        assert opts['retries'] == 0
        assert opts['extractor_retries'] == 0


def test_youtube_has_a_separate_cold_metadata_budget(monkeypatch):
    async def metadata(**kwargs):
        await asyncio.sleep(0.025)
        return {'direct_url': '/youtube/file?variant=hd'}
    monkeypatch.setattr(shared.universal_downloader, 'resolve_media', metadata)
    monkeypatch.setattr(shared, 'settings', SimpleNamespace(
        RESOLVER_TIMEOUT_SECONDS=0.01, YOUTUBE_RESOLVER_TIMEOUT_SECONDS=0.1, RESOLVER_CONCURRENCY=4))
    request = DownloadRequest(url='https://youtu.be/jNQXAC9IVRw', platform=Platform.YOUTUBE)
    result = asyncio.run(shared._run_bounded_metadata_resolve(platform=Platform.YOUTUBE, request=request, url=str(request.url)))
    assert result['direct_url']


@pytest.mark.parametrize('platform', [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.YOUTUBE])
@pytest.mark.parametrize('message', ['security challenge', 'login required', 'private media', 'media not found'])
def test_shared_route_does_not_run_gallery_after_terminal_errors(monkeypatch, platform, message):
    shared._resolve_cache.clear()
    shared._resolve_inflight.clear()
    monkeypatch.setattr(shared.universal_downloader, 'resolve_media', AsyncMock(side_effect=RuntimeError(message)))
    gallery = AsyncMock(return_value=None)
    monkeypatch.setattr(shared, '_resolve_with_gallery_fallback', gallery)
    url = {Platform.FACEBOOK: 'https://www.facebook.com/reel/123', Platform.INSTAGRAM: 'https://www.instagram.com/p/abc/',
           Platform.YOUTUBE: 'https://youtu.be/jNQXAC9IVRw'}[platform]
    result = asyncio.run(shared.download_public(platform, DownloadRequest(url=url, platform=platform), BackgroundTasks()))
    assert not result.success
    gallery.assert_not_awaited()


def test_youtube_profile_fallback_does_not_retry_security_challenges():
    downloader = PublicPlatformDownloader(youtube_proxy_url='http://proxy.example:8080')
    extract = Mock(side_effect=RuntimeError('security challenge'))
    async def run():
        await downloader._extract_youtube_with_profiles(asyncio.get_running_loop(), 'https://youtu.be/jNQXAC9IVRw',
                                                       {}, extract, 'test')
    with pytest.raises(RuntimeError, match='security challenge'):
        asyncio.run(run())
    extract.assert_called_once()
