import asyncio
import io
import json
from unittest.mock import patch

import pytest
from yt_dlp.networking.common import Response
from yt_dlp.networking.exceptions import HTTPError

from app.models.schemas import Quality
from app.platforms.public_platforms import PublicPlatformDownloader


def test_youtube_empty_formats_preserve_observed_bot_restriction():
    downloader = PublicPlatformDownloader()

    def extract(url, download=False):
        opts = ydl.call_args.args[0]
        if opts.get('logger') and not opts.get('no_warnings'):
            opts['logger'].warning('Sign in to confirm you’re not a bot. Use --cookies for authentication.')
            opts['logger'].warning('No video formats found!')
        return {'id': 'jNQXAC9IVRw', 'title': 'Me at the zoo', 'formats': []}

    with patch('app.platforms.public_platforms.yt_dlp.YoutubeDL') as ydl:
        ydl.return_value.__enter__.return_value.extract_info.side_effect = extract
        with pytest.raises(Exception, match='ANTI_BOT_CHALLENGE'):
            asyncio.run(downloader.resolve_media('https://www.youtube.com/watch?v=jNQXAC9IVRw', Quality.HIGH))
        assert ydl.call_count == 1


def test_reddit_proxy_retains_bounded_http_rejection_without_retry():
    from app.platforms.provider_evidence import provider_evidence
    from app.platforms.egress import ProxyMetrics
    records = []
    token = provider_evidence.set(records)
    downloader = PublicPlatformDownloader(proxy_url='http://unused.example:8080')
    error = HTTPError(Response(io.BytesIO(b'<html><title>Blocked</title>network security</html>'),
                               'https://www.reddit.com/comments/hrrh23.json',
                               {'Content-Type': 'text/html'}, 403))
    try:
        with patch('app.platforms.public_platforms.MetadataTransport') as transport:
            request = transport.return_value.__enter__.return_value.request
            request.side_effect = error
            with pytest.raises(RuntimeError, match='PLATFORM_BLOCKED_PROXY'):
                asyncio.run(downloader.resolve_proxy_metadata('https://www.reddit.com/gallery/hrrh23', Quality.HIGH, False, ProxyMetrics()))
            assert request.call_count == 1
        assert records[0]['httpStatuses'] == [403]
        assert records[0]['responseKind'] == 'html'
        assert records[0]['rejectionMarker'] == 'network_security'
    finally:
        provider_evidence.reset(token)


def test_evidence_contains_only_counts_categories_and_approved_host():
    from app.platforms.provider_evidence import ProviderEvidence
    evidence = ProviderEvidence('youtube', 'direct')
    evidence.debug('[youtube] secret-id: Downloading visionos player API JSON')
    evidence.warning('No supported JavaScript runtime could be found. cookie=secret-value')
    evidence.warning('Authorization: Bearer secret-value https://user:pass@proxy.invalid/?token=secret-value')
    evidence.response(Response(io.BytesIO(), 'https://www.youtube.com/watch?v=secret-id&token=secret-value',
                               {'content-type': 'text/html', 'set-cookie': 'secret-value'}, 200))
    evidence.formats({'id': 'secret-id', 'title': 'secret-title', 'formats': [
        {'url': 'https://cdn.invalid/?token=secret-value', 'ext': 'mp4', 'vcodec': 'avc1', 'acodec': 'aac'},
        {'url': 'https://cdn.invalid/storyboard', 'ext': 'mhtml', 'vcodec': 'none', 'acodec': 'none'},
    ]}, PublicPlatformDownloader())
    assert evidence.record['formatCount'] == 2
    assert evidence.record['usableVideoCount'] == evidence.record['usableAudioCount'] == 1
    assert evidence.record['client'] == 'visionos'
    assert evidence.record['phase'] == 'before_normalization'
    assert evidence.record['canonicalHost'] == 'www.youtube.com'
    encoded = json.dumps(evidence.record)
    for value in ('secret-value', 'secret-title', 'secret-id', 'user:pass', 'proxy.invalid', 'set-cookie'):
        assert value not in encoded


def test_unexplained_empty_formats_do_not_become_proxy_eligible():
    from app.api.resolver_errors import classify_resolver_error
    downloader = PublicPlatformDownloader()
    with patch('app.platforms.public_platforms.yt_dlp.YoutubeDL') as ydl:
        ydl.return_value.__enter__.return_value.extract_info.return_value = {'id': 'id', 'title': 'Title', 'formats': []}
        with pytest.raises(Exception) as failure:
            asyncio.run(downloader.resolve_media('https://www.youtube.com/watch?v=jNQXAC9IVRw', Quality.HIGH))
        assert classify_resolver_error('youtube', str(failure.value)) == 'EXTRACTOR_FAILED'


@pytest.mark.parametrize('url', [
    'https://www.reddit.com/gallery/hrrh23',
    'https://www.reddit.com/r/pics/comments/hrrh23/title/',
    'https://www.reddit.com/r/nigerianfood/s/FGKVVqzTy3',
    'https://redd.it/hrrh23',
])
def test_legitimate_reddit_routes_remain_accepted(url):
    from app.models.platform_requests import RedditDownloadIn
    assert str(RedditDownloadIn(url=url).url) == url


def test_diagnostics_reports_empty_upstream_formats_and_skips_proxy(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-key')

    def extract(url, download=False):
        logger = ydl.call_args.args[0]['logger']
        logger.debug('[youtube] id: Downloading visionos player API JSON')
        logger.warning('Sign in to confirm you’re not a bot')
        return {'id': 'id', 'title': 'Private user data must not appear', 'formats': []}

    with patch('app.platforms.public_platforms.yt_dlp.YoutubeDL') as ydl, \
         patch.object(PublicPlatformDownloader, '_proxy_for_url', return_value='http://unused.invalid'), \
         patch.object(PublicPlatformDownloader, 'resolve_proxy_metadata') as proxy:
        ydl.return_value.__enter__.return_value.extract_info.side_effect = extract
        response = TestClient(app).get('/diagnostics/provider',
            params={'platform': 'youtube', 'url': 'https://www.youtube.com/watch?v=jNQXAC9IVRw', 'run_resolver': 'true'},
            headers={'X-DownloadDash-Key': 'test-key'})
        assert response.status_code == 200
        data = response.json()
        assert data['resolver']['errorCode'] == 'ANTI_BOT_CHALLENGE'
        assert data['egress']['proxyRequestCount'] == data['egress']['proxyTotalBytes'] == 0
        assert data['providerEvidence'][0]['formatCount'] == 0
        assert data['providerEvidence'][0]['client'] == 'visionos'
        assert 'Private user data' not in response.text
        proxy.assert_not_called()
