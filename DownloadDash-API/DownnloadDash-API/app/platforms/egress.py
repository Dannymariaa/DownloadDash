"""Public resolution policy. Residential egress is never a media transport."""
import io
import os
import re
import time
from contextvars import ContextVar
from contextlib import closing
from dataclasses import dataclass, asdict
from urllib.parse import urlsplit, parse_qs, urljoin

import httpx
from yt_dlp.networking.common import Response
from yt_dlp.networking.exceptions import HTTPError

from app.api.resolver_errors import classify_resolver_error

public_resolution = ContextVar('public_resolution', default=True)


def direct_subprocess_env():
    return {key: value for key, value in os.environ.items()
            if key.lower() not in {'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'}}

SECRET_KEYS = {'cookie', 'cookies', 'cookiefile', 'authorization', 'proxy-authorization',
               'password', 'token', 'access_token', 'refresh_token', 'session', 'proxy'}


def public_metadata(value):
    if isinstance(value, dict):
        return {key: public_metadata(item) for key, item in value.items()
                if str(key).lower() not in SECRET_KEYS}
    if isinstance(value, list):
        return [public_metadata(item) for item in value]
    return value


def cache_ttl(value, now=None, maximum=240):
    now = time.time() if now is None else now
    ttl = float(maximum)
    def visit(item):
        nonlocal ttl
        if isinstance(item, dict):
            for child in item.values():
                visit(child)
        elif isinstance(item, list):
            for child in item:
                visit(child)
        elif isinstance(item, str) and item.startswith('https://'):
            for key, values in parse_qs(urlsplit(item).query).items():
                if key.lower() in {'expire', 'expires', 'x-expires', 'oe'}:
                    try:
                        expiry = int(values[0], 16) if key.lower() == 'oe' else float(values[0])
                        ttl = min(ttl, expiry - now - 10)
                    except (ValueError, IndexError):
                        pass
    visit(value)
    return max(0, ttl)


@dataclass
class ProxyMetrics:
    proxyRequestCount: int = 0
    proxyUploadBytes: int = 0
    proxyDownloadBytes: int = 0
    proxyFallbackReason: str | None = None
    proxyCacheHit: bool = False
    route: str = 'direct'

    def report(self):
        return {**asdict(self), 'proxyTotalBytes': self.proxyUploadBytes + self.proxyDownloadBytes,
                'measurementScope': 'HTTP body bytes; excludes headers, CONNECT, TLS and vendor overhead'}


def reused_metrics(original):
    metrics = ProxyMetrics(proxyFallbackReason=original.get('proxyFallbackReason'),
                           proxyCacheHit=original.get('route') == 'proxy_metadata',
                           route=original.get('route', 'direct'))
    return metrics.report()


class EgressPolicy:
    def __init__(self, clock=time.monotonic):
        self.clock = clock
        self.health = {}

    def snapshot(self):
        return {provider: {**state, 'proxyCircuitOpen': state['openUntil'] > self.clock(),
                           'preference': 'direct'} for provider, state in self.health.items()}

    async def resolve(self, provider, direct, proxy=None, deadline=None):
        provider = getattr(provider, 'value', provider)
        state = self.health.setdefault(provider, {'directSuccesses': 0, 'directFailures': 0,
            'proxySuccesses': 0, 'proxyFailures': 0, 'consecutiveFailures': 0, 'openUntil': 0,
            'proxyRequestCount': 0, 'proxyUploadBytes': 0, 'proxyDownloadBytes': 0})
        metrics = ProxyMetrics()
        try:
            result = await direct()
            state['directSuccesses'] += 1
        except Exception as error:
            state['directFailures'] += 1
            reason = classify_resolver_error(provider, str(error))
            state['lastDirectError'] = reason
            eligible = reason in {'PUBLIC_NETWORK_ERROR', 'PROVIDER_TIMEOUT'}
            if not eligible or proxy is None or state['openUntil'] > self.clock() or (deadline is not None and self.clock() >= deadline):
                error.egress = metrics.report()
                raise
            metrics.proxyFallbackReason = reason
            metrics.route = 'proxy_metadata'
            try:
                result = await proxy(metrics)
                state['proxySuccesses'] += 1
                state['consecutiveFailures'] = 0
            except Exception as failure:
                state['proxyFailures'] += 1
                code = classify_resolver_error(provider, str(failure))
                infrastructure = code in {'PROXY_AUTH_FAILED', 'PROXY_QUOTA_EXHAUSTED', 'PROXY_UNREACHABLE', 'PROVIDER_TIMEOUT', 'PUBLIC_NETWORK_ERROR'}
                state['consecutiveFailures'] = state['consecutiveFailures'] + 1 if infrastructure else 0
                if code in {'PROXY_AUTH_FAILED', 'PROXY_QUOTA_EXHAUSTED', 'PROXY_UNREACHABLE'} or state['consecutiveFailures'] >= 2:
                    state['openUntil'] = self.clock() + 60
                failure.egress = metrics.report()
                raise
            finally:
                for key in ('proxyRequestCount', 'proxyUploadBytes', 'proxyDownloadBytes'):
                    state[key] += getattr(metrics, key)
        return {**public_metadata(result), 'egress': metrics.report()}


class MetadataTransport:
    """One pooled, anonymous HTTP session per fallback; count encoded body bytes.

    Reject known media URLs before sending, and media MIME types before consuming
    a response. Redirects are validated separately. No user cookie jar is loaded.
    """
    ROOTS = ('youtube.com', 'youtu.be', 'youtubei.googleapis.com', 'ytimg.com',
             'googlevideo.com', 'reddit.com', 'redd.it', 'redditmedia.com',
             'tiktok.com', 'tiktokv.com', 'tiktokcdn.com', 'tiktokcdn-us.com',
             'instagram.com', 'cdninstagram.com', 'facebook.com', 'fb.com', 'fb.watch',
             'fbcdn.net', 'pinterest.com', 'pin.it', 'pinimg.com', 'twitter.com',
             'x.com', 'twimg.com')

    def __init__(self, proxy, metrics, transport=None):
        self.metrics = metrics
        self.client = httpx.Client(proxy=proxy if transport is None else None, transport=transport,
                                   timeout=5, trust_env=False, follow_redirects=False)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.client.close()

    def _validate(self, url):
        parsed = urlsplit(url)
        host = (parsed.hostname or '').lower()
        if (parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port not in (None, 443)
                or not any(host == root or host.endswith('.' + root) for root in self.ROOTS)):
            raise ValueError('Unsupported public metadata host')
        if re.search(r'\.(mp4|m3u8|mpd|webm|m4a|mp3|aac|jpg|jpeg|png|webp|gif|avif|ts)(?:$|/)', parsed.path, re.I) or '/videoplayback' in parsed.path:
            raise ValueError('Proxy media transfer is disabled')

    def request(self, url, method='GET', headers=None, data=None):
        headers = {key: value for key, value in (headers or {}).items() if key.lower() not in SECRET_KEYS}
        self.client.cookies.clear()
        for _ in range(6):
            self._validate(url)
            metrics = self.metrics
            payload = data.encode() if isinstance(data, str) else data or b''
            if not isinstance(payload, bytes):
                raise ValueError('Unsupported metadata request body')
            class Upload(httpx.SyncByteStream):
                def __iter__(self):
                    metrics.proxyUploadBytes += len(payload)
                    yield payload
            request_headers = {key: value for key, value in headers.items()
                               if key.lower() not in {'content-length', 'transfer-encoding'}}
            if payload:
                request_headers['Content-Length'] = str(len(payload))
            req = self.client.build_request(method, url, headers=request_headers, content=Upload() if payload else None)
            self.metrics.proxyRequestCount += 1
            try:
                response = self.client.send(req, stream=True)
            except httpx.ProxyError as exc:
                # Classification only; never expose proxy URL/credentials.
                code = classify_resolver_error(None, str(exc))
                raise RuntimeError(code if code.startswith('PROXY_') else 'PROXY_UNREACHABLE') from None
            except httpx.TransportError:
                raise RuntimeError('PROXY_UNREACHABLE') from None
            with closing(response):
                if response.status_code in (301, 302, 303, 307, 308):
                    url = urljoin(url, response.headers.get('location', ''))
                    if response.status_code == 303 or response.status_code in (301, 302) and method == 'POST':
                        method, data = 'GET', None
                    continue  # No redundant download of redirect HTML.
                mime = response.headers.get('content-type', '').split(';')[0].lower()
                if mime.startswith(('image/', 'video/', 'audio/')) or mime in {'application/octet-stream', 'application/vnd.apple.mpegurl', 'application/x-mpegurl', 'application/dash+xml'}:
                    raise ValueError('Proxy media body is disabled')
                # HTTPX decodes the content, while num_bytes_downloaded counts
                # the encoded payload consumed from the network, including errors.
                try:
                    if response.status_code >= 400:
                        preview = bytearray()
                        for chunk in response.iter_bytes(chunk_size=8192):
                            preview.extend(chunk)
                            if len(preview) >= 8192:
                                break
                        body = bytes(preview[:8192])
                    else:
                        body = response.read()
                finally:
                    self.metrics.proxyDownloadBytes += response.num_bytes_downloaded
                clean_headers = dict(response.headers)
                clean_headers.pop('content-encoding', None)
                clean_headers.pop('content-length', None)
                reply = Response(io.BytesIO(body), str(response.url), clean_headers, response.status_code)
                if response.status_code >= 400:
                    restricted = classify_resolver_error(None, body[:8192].decode('utf-8', errors='replace'))
                    if restricted in {'ANTI_BOT_CHALLENGE', 'COOKIE_REQUIRED', 'PRIVATE_MEDIA', 'MEDIA_NOT_FOUND'}:
                        raise RuntimeError(restricted)
                    raise HTTPError(reply)
                return reply
        raise RuntimeError('Metadata redirect limit exceeded')

    def urlopen(self, request):
        if isinstance(request, str):
            return self.request(request)
        return self.request(request.url, request.method, dict(request.headers), request.data)


def bandwidth_projection(average_bytes, budget=1_073_741_824):
    return int(budget // average_bytes) if average_bytes > 0 else None


egress_policy = EgressPolicy()
