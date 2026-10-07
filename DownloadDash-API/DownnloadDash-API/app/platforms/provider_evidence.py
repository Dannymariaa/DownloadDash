"""Bounded, value-free evidence from existing YouTube/Reddit attempts."""
import re
from contextvars import ContextVar
from urllib.parse import urlsplit

from app.api.resolver_errors import classify_resolver_error

provider_evidence = ContextVar('provider_evidence', default=None)


class ProviderEvidence:
    def __init__(self, provider, route):
        self.provider = provider
        self.record = {'provider': provider, 'route': route, 'extractor': 'yt-dlp',
                       'client': 'default', 'categories': [], 'httpStatuses': []}
        records = provider_evidence.get()
        if records is not None and len(records) < 4:
            records.append(self.record)

    def debug(self, message):
        # Never retain the log line (it can contain URLs or user metadata).
        match = re.search(r'Downloading ([a-z_]+) player API JSON', str(message))
        if match:
            self.record['client'] = match[1][:32]

    def warning(self, message):
        text = str(message).lower()
        if 'not a bot' in text or 'captcha' in text:
            category = 'ANTI_BOT_CHALLENGE'
        elif 'javascript runtime' in text:
            category = 'JS_RUNTIME_UNAVAILABLE'
        elif 'po token' in text or 'po_token' in text:
            category = 'PO_TOKEN_UNAVAILABLE'
        elif 'signature' in text or 'nsig' in text or 'challenge solving' in text:
            category = 'SIGNATURE_EXTRACTION_FAILED'
        elif 'no video formats' in text or 'requested format is not available' in text:
            category = 'NO_FORMATS'
        else:
            category = classify_resolver_error(self.provider, text)
        if category not in self.record['categories'] and len(self.record['categories']) < 16:
            self.record['categories'].append(category)
        for status in re.findall(r'HTTP(?: Error|Error)?[ :<]+([45]\d\d)', str(message)):
            self.status(int(status))

    error = warning

    def status(self, status):
        if isinstance(status, int) and status not in self.record['httpStatuses'] and len(self.record['httpStatuses']) < 12:
            self.record['httpStatuses'].append(status)

    def response(self, response):
        self.status(getattr(response, 'status', None))
        host = urlsplit(getattr(response, 'url', '')).hostname or ''
        if host in {'reddit.com', 'www.reddit.com', 'old.reddit.com', 'redd.it',
                    'www.youtube.com', 'youtube.com', 'youtubei.googleapis.com'}:
            self.record['canonicalHost'] = host
        mime = response.headers.get('content-type', '').split(';')[0].lower()
        if mime in {'text/html', 'application/json', 'text/plain'}:
            self.record['contentType'] = mime
            self.record['responseKind'] = 'html' if mime == 'text/html' else 'json' if mime == 'application/json' else 'text'

    def failure(self, error, bounded_proxy_body=False):
        self.warning(str(error))
        response = getattr(error, 'response', None)
        if response is None:
            return
        self.response(response)
        if bounded_proxy_body:
            # This is the already-buffered error preview, never another network read.
            preview = response.read(8192)
            self.record['errorPreviewBytes'] = len(preview)
            body = preview.decode('utf-8', errors='replace').lower()
            for marker, category in [('network security', 'network_security'),
                                     ('too many requests', 'rate_limit'),
                                     ('access denied', 'access_denied'),
                                     ('blocked', 'blocked'), ('captcha', 'captcha')]:
                if marker in body:
                    self.record['rejectionMarker'] = category
                    break

    def formats(self, info, downloader):
        info = info if isinstance(info, dict) else {}
        formats = [f for f in (info.get('formats') or []) if isinstance(f, dict)]
        self.record.update(formatCount=len(formats),
                           usableVideoCount=sum(downloader._is_playable_video_format(f) for f in formats),
                           usableAudioCount=sum(downloader._is_playable_audio_format(f) for f in formats),
                           metadataPresent=bool(info.get('id') and info.get('title')),
                           phase='before_normalization')

    def restriction(self):
        # Missing formats alone never establish proxy eligibility. Preserve only
        # observed terminal restrictions; do not infer an egress block.
        for code in ('ANTI_BOT_CHALLENGE', 'PRIVATE_MEDIA', 'MEDIA_NOT_FOUND',
                     'LOGIN_REQUIRED', 'COOKIE_REQUIRED', 'COOKIE_EXPIRED', 'RATE_LIMITED'):
            if code in self.record['categories']:
                return code
        return None
