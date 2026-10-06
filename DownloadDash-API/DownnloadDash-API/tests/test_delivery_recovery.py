import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.platforms.public_platforms import PublicPlatformDownloader
from app.platforms.universal_downloader import UniversalMediaDownloader


def test_cached_download_never_invokes_extractor(monkeypatch, tmp_path):
    from unittest.mock import Mock
    public = PublicPlatformDownloader()
    public._resolved_dir = tmp_path
    info = {'id': '123', 'formats': [{'url': 'https://cdn.example/video.mp4'}], 'requested_downloads': [{'old': True}]}
    public.remember_resolved_media('https://youtu.be/123', info)
    downloader = Mock()
    public._download_resolved_or_extract(downloader, 'https://youtu.be/123')
    downloader.extract_info.assert_not_called()
    assert 'requested_downloads' not in downloader.process_ie_result.call_args.args[0]


def test_single_entry_video_retains_split_audio_for_managed_delivery(monkeypatch):
    import asyncio
    from unittest.mock import MagicMock

    from app.models.schemas import Quality
    public = PublicPlatformDownloader()
    entry = {'id': 'one', 'url': 'https://cdn.example/video.mp4', 'ext': 'mp4', 'formats': [
        {'url': 'https://cdn.example/video.mp4', 'vcodec': 'h264', 'acodec': 'none', 'ext': 'mp4', 'height': 720},
        {'url': 'https://cdn.example/audio.m4a', 'vcodec': 'none', 'acodec': 'aac', 'ext': 'm4a'}]}
    factory = MagicMock()
    factory.return_value.__enter__.return_value.extract_info.return_value = {'entries': [entry]}
    monkeypatch.setattr('app.platforms.public_platforms.yt_dlp.YoutubeDL', factory)
    source = 'https://www.instagram.com/reel/example/'
    result = asyncio.run(public.resolve_media(source, Quality.HIGH))
    assert result['downloads']['videoHD'].startswith('/download/file?')
    assert len(public.get_resolved_media(source)['formats']) == 2


def test_direct_delivery_streams_ranges_and_closes_upstream(monkeypatch):
    import asyncio

    from fastapi import BackgroundTasks

    from app.api import download
    chunks = []
    class Upstream:
        status_code = 206
        headers = httpx.Headers({'content-type': 'video/mp4', 'content-length': '6', 'content-range': 'bytes 0-5/12', 'accept-ranges': 'bytes'})
        aclose = AsyncMock()
        async def aiter_bytes(self, **kwargs):
            for part in [b'abc', b'def']:
                chunks.append(part)
                yield part
    upstream = Upstream()
    class Client:
        aclose = AsyncMock()
        def __init__(self, **kwargs):
            pass
        def build_request(self, method, url, headers):
            assert headers['Range'] == 'bytes=0-5'
        async def send(self, request, **kwargs):
            assert kwargs['stream'] is True
            return upstream
    monkeypatch.setattr(download.httpx, 'AsyncClient', Client)
    async def check():
        response = await download._serve_download_file(BackgroundTasks(), 'https://v.redd.it/test.mp4',
                                                       'clip.mp4', 'https://reddit.com/comments/abc', 'video', 'bytes=0-5')
        assert response.status_code == 206
        assert response.headers['content-range'] == 'bytes 0-5/12'
        assert not chunks
        body = response.body_iterator
        assert await anext(body) == b'abc'
        assert len(chunks) == 1
        assert await anext(body) == b'def'
        with pytest.raises(StopAsyncIteration):
            await anext(body)
        upstream.aclose.assert_awaited_once()
        Client.aclose.assert_awaited_once()
    asyncio.run(check())


def test_tiktok_hydration_keeps_source_photos_and_separate_soundtrack():
    universal = UniversalMediaDownloader(PublicPlatformDownloader())
    item = {'id': '123', 'desc': 'Photos', 'imagePost': {'images': [
        {'imageURL': {'urlList': ['https://p16.tiktokcdn.com/a.jpg', 'https://p19.tiktokcdn.com/a.jpg']},
         'thumbnail': {'urlList': ['https://p16.tiktokcdn.com/thumb.jpg']}},
        {'imageURL': {'urlList': ['https://p16.tiktokcdn.com/b.png']}}
    ]}, 'music': {'playUrl': 'https://sf.tiktokcdn.com/music.mp3'}}
    html = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">' + json.dumps({
        '__DEFAULT_SCOPE__': {'webapp.video-detail': {'itemInfo': {'itemStruct': item}}}}) + '</script>'
    result = universal._tiktok_photo_payload(html, '123')
    assert [i['url'] for i in result['downloads']['items']] == [
        'https://p16.tiktokcdn.com/a.jpg', 'https://p16.tiktokcdn.com/b.png', 'https://sf.tiktokcdn.com/music.mp3']
    assert result['downloads']['items'][1]['extension'] == 'png'


def test_generic_ticket_binds_every_delivery_parameter(monkeypatch):
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    params = dict(url='', sourceUrl='https://www.pinterest.com/pin/123/',
                  mediaType='hd', filename='pin.mp4', expires=str(int(time.time()) + 300))
    fields = ['v2', 'GET', '/download/file', params['expires'], params['url'],
              params['sourceUrl'], params['mediaType'], params['filename']]
    params['signature'] = hmac.new(b'test-download-key', '\n'.join(fields).encode(), hashlib.sha256).hexdigest()
    from fastapi.responses import JSONResponse
    route = next(r for r in app.routes if getattr(r, 'path', None) == '/download/file' and 'GET' in r.methods)
    monkeypatch.setattr(route.dependant, 'call', AsyncMock(return_value=JSONResponse({'authorized': True})))
    client = TestClient(app)
    assert client.get('/download/file', params=params).status_code == 200
    for key in ['url', 'sourceUrl', 'mediaType', 'filename']:
        assert client.get('/download/file', params={**params, key: 'changed'}).status_code == 403


def test_resolved_formats_are_private_bounded_and_expire(monkeypatch, tmp_path):
    public = PublicPlatformDownloader()
    public._resolved_dir = tmp_path
    info = {'id': 'abc', 'formats': [{'url': 'https://cdn.example/video.mp4'}]}
    public.remember_resolved_media('https://youtu.be/abc', info)
    cached = public.get_resolved_media('https://youtu.be/abc')
    cached['formats'].clear()
    assert public.get_resolved_media('https://youtu.be/abc')['formats']
    now = time.time()
    monkeypatch.setattr('app.platforms.public_platforms.time.time', lambda: now + 1000)
    assert public.get_resolved_media('https://youtu.be/abc') is None


def test_youtube_file_uses_cached_formats_without_metadata_extraction(monkeypatch, tmp_path):
    from app.routers import youtube
    monkeypatch.setenv('DOWNLOADDASH_API_KEY', 'test-download-key')
    monkeypatch.setattr(youtube.public_downloader, 'get_resolved_media', lambda url: {'id': 'abc'})
    resolver = AsyncMock(side_effect=AssertionError('re-extracted metadata'))
    monkeypatch.setattr(youtube.public_downloader, 'resolve_media', resolver)
    path = tmp_path / 'test.mp4'
    path.write_bytes(b'nonzero fixture')
    monkeypatch.setattr(youtube.public_downloader, 'download_youtube_variant', AsyncMock(return_value={
        'path': str(path), 'filename': 'test.mp4', 'media_type': 'video/mp4'}))
    response = TestClient(app).get('/youtube/file', params={'url': 'https://youtu.be/jNQXAC9IVRw'},
                                   headers={'X-DownloadDash-Key': 'test-download-key'})
    assert response.status_code == 200
    resolver.assert_not_awaited()
