import re
from urllib.parse import urlsplit
from typing import Optional

from app.models.schemas import Platform


PROVIDER_ERROR_CODES = {
    "PROXY_AUTH_FAILED",
    "PROXY_QUOTA_EXHAUSTED",
    "PROXY_UNREACHABLE",
    "PLATFORM_BLOCKED_PROXY",
    "COOKIE_REQUIRED",
    "COOKIE_EXPIRED",
    "LOGIN_REQUIRED",
    "ANTI_BOT_CHALLENGE",
    "RATE_LIMITED",
    "MEDIA_NOT_FOUND",
    "PRIVATE_MEDIA",
    "PROXY_BLOCKED",
    "EXTRACTOR_OUTDATED",
    "EXTRACTOR_FAILED",
    "PROVIDER_TIMEOUT",
}

# Retrying another extraction path cannot make restricted or unavailable media
# public. Preserve these errors at every resolver/fallback boundary.
TERMINAL_PROVIDER_ERRORS = {
    'INVALID_URL', 'UNSUPPORTED_MEDIA', 'PUBLIC_NETWORK_ERROR',
    'ANTI_BOT_CHALLENGE', 'COOKIE_REQUIRED', 'COOKIE_EXPIRED', 'LOGIN_REQUIRED',
    'PRIVATE_MEDIA', 'MEDIA_NOT_FOUND', 'PROVIDER_TIMEOUT', 'RATE_LIMITED',
    'PLATFORM_BLOCKED_PROXY', 'PROXY_BLOCKED', 'PROXY_AUTH_FAILED',
    'PROXY_QUOTA_EXHAUSTED', 'PROXY_UNREACHABLE',
}

SECRET_PATTERNS = (
    re.compile(r"(https?://)([^:@/\s]+):([^@/\s]+)@", re.IGNORECASE),
    re.compile(r"(socks[45]h?://)([^:@/\s]+):([^@/\s]+)@", re.IGNORECASE),
    re.compile(r"(?i)\b(authorization)\s*:\s*(bearer|basic)\s+[^\s]+"),
    re.compile(r"(?i)\b(cookie|token|authorization|password|passwd|secret)=([^&\s]+)"),
    re.compile(r"(?i)\b(cookie_names|cookiefile_path)=([^)\s]+)"),
)


def _platform_value(platform: Platform | str | None) -> str:
    return getattr(platform, "value", str(platform or "")).lower()


def sanitize_provider_error(raw_error: Optional[str]) -> str:
    text = re.sub(r"\s+", " ", raw_error or "").strip()
    for pattern in SECRET_PATTERNS:
        if "cookie_names|cookiefile_path" in pattern.pattern:
            text = pattern.sub(lambda match: f"{match.group(1)}=<redacted>", text)
        elif "(authorization)" in pattern.pattern:
            text = pattern.sub(lambda match: f"{match.group(1)}: <redacted>", text)
        elif pattern.pattern.startswith("(?i)"):
            text = pattern.sub(lambda match: f"{match.group(1)}=<redacted>", text)
        else:
            text = pattern.sub(lambda match: f"{match.group(1)}<redacted>:<redacted>@", text)
    text = re.sub(
        r"https?://[^\s\"'<>]+",
        lambda match: _redact_url(match.group(0)),
        text,
        flags=re.IGNORECASE,
    )
    return text


def _redact_url(value: str) -> str:
    try:
        parsed = urlsplit(value.rstrip(")]},.!"))
        return f"{parsed.scheme}://{parsed.netloc}/<redacted>"
    except ValueError:
        return "<redacted-url>"


def classify_resolver_error(platform: Platform | str | None, raw_error: Optional[str]) -> str:
    text = sanitize_provider_error(raw_error).lower()
    platform_key = _platform_value(platform)

    # Restrictions outrank a generic status/timeout included in the same error.
    restrictions = ('ANTI_BOT_CHALLENGE', 'PRIVATE_MEDIA', 'COOKIE_EXPIRED', 'COOKIE_REQUIRED',
                    'LOGIN_REQUIRED', 'MEDIA_NOT_FOUND', 'INVALID_URL', 'UNSUPPORTED_MEDIA')
    for code in restrictions:
        if code.lower() in text:
            return code
    if any(marker in text for marker in ('captcha', 'challenge', 'checkpoint', "confirm you're not a bot")):
        return 'ANTI_BOT_CHALLENGE'
    if any(marker in text for marker in ('private', 'followers only', 'paid content', 'subscription required')):
        return 'PRIVATE_MEDIA'
    if '407' in text or 'proxy authentication' in text or 'proxy auth' in text:
        return 'PROXY_AUTH_FAILED'
    if platform_key in {'twitter', 'x'} and any(marker in text for marker in ('temporarily locked', 'unlock your account', 'authorization: denied by access control')):
        return 'LOGIN_REQUIRED'
    if any(marker in text for marker in ('login required', 'log in', 'sign in', 'authentication required')):
        return 'COOKIE_REQUIRED'
    if '404' in text or 'not found' in text:
        return 'MEDIA_NOT_FOUND'
    for code in ('PROXY_AUTH_FAILED', 'PROXY_QUOTA_EXHAUSTED', 'PROXY_UNREACHABLE', 'PUBLIC_NETWORK_ERROR', 'PLATFORM_BLOCKED_PROXY'):
        if code.lower() in text:
            return code

    if not text:
        return "EXTRACTOR_FAILED"

    if "407" in text or "proxy authentication" in text or "proxy auth" in text:
        return "PROXY_AUTH_FAILED"
    if "proxy" in text and any(token in text for token in ("quota", "bandwidth", "exhausted", "limit exceeded")):
        return "PROXY_QUOTA_EXHAUSTED"
    if "proxy" in text and any(token in text for token in ("connection refused", "timed out", "unreachable", "name resolution", "cannot connect")):
        return "PROXY_UNREACHABLE"

    if any(token in text for token in ('timed out', 'timeout')):
        return 'PROVIDER_TIMEOUT'
    if any(token in text for token in ('connection refused', 'network is unreachable', 'name resolution', 'connection reset', 'connecterror')):
        return 'PUBLIC_NETWORK_ERROR'

    if any(token in text for token in ("429", "too many requests", "rate limit", "temporarily blocked", "please wait a few minutes")):
        return "RATE_LIMITED"

    if any(token in text for token in ("cookie expired", "expired cookie", "session expired", "login session has expired")):
        return "COOKIE_EXPIRED"

    if platform_key in {"twitter", "x"} and any(
        token in text
        for token in (
            "temporarily locked",
            "unlock your account",
            "authorization: denied by access control",
        )
    ):
        return "LOGIN_REQUIRED"

    if any(token in text for token in ("html_kind=challenge", "checkpoint", "challenge", "captcha")):
        return "ANTI_BOT_CHALLENGE"

    if any(token in text for token in ("please report this issue", "extractor is broken", "unable to extract relay data")):
        return "EXTRACTOR_OUTDATED"

    if "html_kind=login" in text or "facebook_http_status=200" in text and "login" in text:
        return "COOKIE_REQUIRED"

    if any(
        token in text
        for token in (
            "login required",
            "log in",
            "login form",
            "sign in",
            "use --cookies",
            "cookies-from-browser",
            "authentication required",
            "unauthorized",
            "401",
        )
    ):
        return "COOKIE_REQUIRED"

    if "proxy" in text and any(token in text for token in ("403", "forbidden", "access denied", "blocked")):
        return "PROXY_BLOCKED"

    if "403" in text or "forbidden" in text or "access denied" in text or "blocked" in text:
        return "PLATFORM_BLOCKED_PROXY"

    private_markers = (
        "private",
        "restricted to",
        "followers only",
        "only shared it with",
        "not available because the owner",
        "not available to you",
    )
    if any(token in text for token in private_markers):
        return "PRIVATE_MEDIA"

    missing_markers = (
        "media not found",
        "does not exist",
        "page not found",
        "post not found",
        "tweet not found",
        "video not found",
        "no longer available",
        "deleted",
        "removed",
    )
    if any(token in text for token in missing_markers):
        return "MEDIA_NOT_FOUND"

    if platform_key in {"twitter", "x"} and any(token in text for token in ("no media found", "no video in this tweet", "media-less")):
        return "MEDIA_NOT_FOUND"

    if platform_key in {"twitter", "x"} and "no direct url found" in text:
        return "COOKIE_REQUIRED"

    if any(token in text for token in ("unable to extract", "failed to extract", "unsupported url", "no formats found", "no video formats found")):
        return "EXTRACTOR_FAILED"

    return "EXTRACTOR_FAILED"
