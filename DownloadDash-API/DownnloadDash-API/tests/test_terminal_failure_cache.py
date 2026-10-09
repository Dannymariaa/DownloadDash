import asyncio
from unittest.mock import AsyncMock

from app.api import shared
from app.config import Settings
from app.models.schemas import DownloadRequest, Platform
from app.platforms.egress import EgressPolicy


def test_metadata_proxy_is_optional_and_disabled_by_default():
    assert Settings(_env_file=None).ENABLE_METADATA_PROXY_FALLBACK is False


def test_blocked_requests_share_short_cache_without_affecting_other_providers(monkeypatch):
    async def run():
        shared._resolve_cache.clear()
        shared._resolve_inflight.clear()
        direct = AsyncMock(side_effect=RuntimeError('ANTI_BOT_CHALLENGE'))
        monkeypatch.setattr(shared, '_run_bounded_metadata_resolve', direct)
        request = DownloadRequest(url='https://www.youtube.com/watch?v=jNQXAC9IVRw', platform=Platform.YOUTUBE)
        args = dict(platform=Platform.YOUTUBE, request=request, cache_key='blocked-test')
        results = await asyncio.gather(*(shared._resolve_public_metadata(**args) for _ in range(100)))
        cached = await shared._resolve_public_metadata(**args)
        assert direct.await_count == 1
        assert all(r[0] is None and str(r[1]) == 'ANTI_BOT_CHALLENGE' for r in results)
        assert cached[0] is None and cached[2] is True and cached[3] == 0
        assert cached[1].egress['proxyTotalBytes'] == 0
        direct.side_effect = None
        direct.return_value = {'direct_url': 'https://i.pinimg.com/image.jpg'}
        other = await shared._resolve_public_metadata(platform=Platform.PINTEREST,
            request=DownloadRequest(url='https://www.pinterest.com/pin/123/'), cache_key='other-provider')
        assert other[0]['direct_url'] and other[1] is None
        expires, _ = shared._resolve_cache['blocked-test']
        monkeypatch.setattr(shared.time, 'time', lambda: expires + 1)
        assert (await shared._resolve_public_metadata(**args))[0]['direct_url']
        assert direct.await_count == 3
        shared._resolve_cache.clear()
    asyncio.run(run())


def test_reddit_forbidden_never_uses_optional_proxy():
    async def run():
        proxy = AsyncMock()
        try:
            await EgressPolicy().resolve('reddit', AsyncMock(side_effect=RuntimeError('HTTP 403')), proxy)
        except RuntimeError:
            pass
        proxy.assert_not_called()
    asyncio.run(run())


def test_subprocess_environment_excludes_proxy_variables(monkeypatch):
    from app.platforms.egress import direct_subprocess_env
    for key in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'):
        monkeypatch.setenv(key, 'http://unused.invalid')
    env = direct_subprocess_env()
    assert not any(key.lower().endswith('_proxy') for key in env)
    assert env.get('PATH') == __import__('os').environ.get('PATH')


def test_configured_proxy_is_not_used_without_explicit_opt_in(monkeypatch):
    async def run():
        proxy = AsyncMock()
        monkeypatch.setattr(shared.settings, 'ENABLE_METADATA_PROXY_FALLBACK', False)
        monkeypatch.setattr(shared.public_downloader, '_proxy_for_url', lambda _: 'http://unused.invalid')
        monkeypatch.setattr(shared.public_downloader, 'resolve_proxy_metadata', proxy)
        monkeypatch.setattr(shared.universal_downloader, 'resolve_media', AsyncMock(side_effect=RuntimeError('connection reset')))
        request = DownloadRequest(url='https://www.reddit.com/gallery/hrrh23', platform=Platform.REDDIT)
        try:
            await shared._run_bounded_metadata_resolve(platform=Platform.REDDIT, request=request, url=str(request.url))
        except RuntimeError:
            pass
        proxy.assert_not_called()
    asyncio.run(run())
