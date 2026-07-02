import html
import re
import time
from urllib.parse import urlparse

import requests

from config import Config
from metrics import metrics
from proxy import session
from utils.logger import logger

META_RE = re.compile(
    r"<meta\s+[^>]*(?:property|name)=['\"](?P<name>og:title|twitter:title|description|og:description|twitter:description|og:type|og:video(?::secure_url|:url)?|twitter:player|og:image)['\"][^>]*content=['\"](?P<content>[^'\"]{1,2000})['\"][^>]*>",
    re.IGNORECASE,
)
META_RE_REVERSED = re.compile(
    r"<meta\s+[^>]*content=['\"](?P<content>[^'\"]{1,2000})['\"][^>]*(?:property|name)=['\"](?P<name>og:title|twitter:title|description|og:description|twitter:description|og:type|og:video(?::secure_url|:url)?|twitter:player|og:image)['\"][^>]*>",
    re.IGNORECASE,
)
TITLE_RE = re.compile(r"<title[^>]*>(?P<title>.{1,300}?)</title>", re.IGNORECASE | re.DOTALL)


class UpstreamBlocked(Exception):
    pass


def detect_platform(url):
    host = urlparse(url).netloc.lower()
    if "youtube." in host or "youtu.be" in host:
        return "youtube"
    if "tiktok." in host:
        return "tiktok"
    if "instagram." in host:
        return "instagram"
    if "facebook." in host or "fb.watch" in host:
        return "facebook"
    if "twitter." in host or host == "x.com" or host.endswith(".x.com"):
        return "x"
    if "reddit." in host:
        return "reddit"
    if "pinterest." in host or "pin.it" in host:
        return "pinterest"
    return "generic"


def validate_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in Config.ALLOWED_SCHEMES or not parsed.netloc:
        raise ValueError("Only absolute http and https URLs are supported.")
    return url


def _is_allowed_content_type(content_type):
    value = (content_type or "").split(";", 1)[0].strip().lower()
    if not value:
        return True
    if value in Config.BLOCKED_CONTENT_TYPES:
        return False
    if any(value.startswith(prefix) for prefix in Config.BLOCKED_CONTENT_PREFIXES):
        return False
    return any(allowed in value for allowed in Config.ALLOWED_CONTENT_TYPES)


def _normalize_meta_name(name):
    name = name.lower()
    if name in ("og:title", "twitter:title"):
        return "title"
    if name in ("description", "og:description", "twitter:description"):
        return "description"
    if name.startswith("og:video") or name == "twitter:player":
        return "media_url"
    if name == "og:image":
        return "thumbnail_url"
    if name == "og:type":
        return "type"
    return name


def _parse_metadata(fragment):
    metadata = {}

    title_match = TITLE_RE.search(fragment)
    if title_match:
        metadata["title"] = html.unescape(" ".join(title_match.group("title").split()))

    for regex in (META_RE, META_RE_REVERSED):
        for match in regex.finditer(fragment):
            key = _normalize_meta_name(match.group("name"))
            metadata.setdefault(
                key, html.unescape(" ".join(match.group("content").split()))
            )

    return metadata


def _has_enough_metadata(fragment, metadata):
    if "</head" in fragment.lower():
        return True
    return bool(metadata.get("title") and (metadata.get("description") or metadata.get("media_url")))


def _request(method, url, platform):
    start = time.monotonic()
    response = None
    bytes_read = 0
    status_code = None
    content_length = 0
    proxy_used = bool(Config.PROXY_URL)

    try:
        response = session.request(
            method,
            url,
            timeout=Config.REQUEST_TIMEOUT,
            stream=True,
            allow_redirects=False,
        )
        status_code = response.status_code
        content_length = int(response.headers.get("Content-Length") or 0)
        return response, start, bytes_read, status_code, content_length, proxy_used
    except requests.RequestException as exc:
        elapsed = (time.monotonic() - start) * 1000
        logger.info(
            "upstream platform=%s method=%s url=%s status=%s content_length=%s bytes=%s time_ms=%.2f proxy=%s error=%s",
            platform,
            method,
            url,
            status_code,
            content_length,
            bytes_read,
            elapsed,
            proxy_used,
            exc,
        )
        raise


def _close_and_log(response, start, platform, method, url, bytes_read):
    status_code = response.status_code if response is not None else None
    content_length = int(response.headers.get("Content-Length") or 0) if response else 0
    elapsed = (time.monotonic() - start) * 1000
    retries = 0
    try:
        retries = len(response.raw.retries.history) if response is not None else 0
    except AttributeError:
        retries = 0

    if response is not None:
        response.close()

    metrics.record_upstream(platform, bytes_read)
    logger.info(
        "upstream platform=%s method=%s url=%s status=%s content_length=%s bytes=%s time_ms=%.2f proxy=%s retries=%s",
        platform,
        method,
        url,
        status_code,
        content_length,
        bytes_read,
        elapsed,
        bool(Config.PROXY_URL),
        retries,
    )


def _head_probe(url, platform):
    response, start, _, _, _, _ = _request("HEAD", url, platform)
    try:
        if response.status_code >= 400:
            return {"status_code": response.status_code}, False

        headers = response.headers
        content_type = headers.get("Content-Type", "")
        content_length = int(headers.get("Content-Length") or 0)
        metadata = {
            "status_code": response.status_code,
            "content_type": content_type,
            "content_length": content_length,
            "final_url": url,
        }

        if 300 <= response.status_code < 400:
            metadata["redirect_url"] = headers.get("Location", "")
            return metadata, True

        if not _is_allowed_content_type(content_type):
            metadata["blocked_body_fetch"] = True
            return metadata, True

        return metadata, False
    finally:
        _close_and_log(response, start, platform, "HEAD", url, 0)


def _get_partial_metadata(url, platform):
    response, start, _, _, _, _ = _request("GET", url, platform)
    bytes_read = 0
    chunks = []

    try:
        if response.status_code >= 400:
            raise ValueError(f"Upstream returned HTTP {response.status_code}.")
        if 300 <= response.status_code < 400:
            return {
                "status_code": response.status_code,
                "redirect_url": response.headers.get("Location", ""),
                "body_bytes_read": 0,
            }

        content_type = response.headers.get("Content-Type", "")
        if not _is_allowed_content_type(content_type):
            raise UpstreamBlocked("Blocked non-metadata content type.")

        metadata = {
            "status_code": response.status_code,
            "content_type": content_type,
            "content_length": int(response.headers.get("Content-Length") or 0),
        }

        for chunk in response.iter_content(chunk_size=Config.READ_CHUNK_SIZE, decode_unicode=False):
            if not chunk:
                continue
            remaining = Config.MAX_HTML_BYTES - bytes_read
            if remaining <= 0:
                break
            if len(chunk) > remaining:
                chunk = chunk[:remaining]
            bytes_read += len(chunk)
            chunks.append(chunk)
            fragment = b"".join(chunks).decode("utf-8", errors="ignore")
            metadata.update(_parse_metadata(fragment))
            if _has_enough_metadata(fragment, metadata):
                break

        metadata["body_bytes_read"] = bytes_read
        metadata["max_body_bytes"] = Config.MAX_HTML_BYTES
        return metadata
    finally:
        _close_and_log(response, start, platform, "GET", url, bytes_read)


def extract_metadata(url):
    validate_url(url)
    platform = detect_platform(url)

    head_metadata, head_is_enough = _head_probe(url, platform)
    if head_is_enough:
        return {
            "platform": platform,
            "url": url,
            "metadata": head_metadata,
            "network_strategy": "head_only",
        }

    get_metadata = _get_partial_metadata(url, platform)
    merged = {**head_metadata, **get_metadata}
    return {
        "platform": platform,
        "url": url,
        "metadata": merged,
        "network_strategy": "head_then_partial_get",
    }
