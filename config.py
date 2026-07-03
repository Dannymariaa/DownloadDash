import os

from dotenv import load_dotenv

load_dotenv()


def _csv(value, default):
    raw = os.getenv(value)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


class Config:
    PROXY_URL = os.getenv("PROXY", "").strip()
    REQUIRE_PROXY = os.getenv("REQUIRE_PROXY", "0").strip() == "1"

    REDIS_URL = os.getenv("REDIS_URL", "").strip()
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None
    REDIS_SOCKET_TIMEOUT = float(os.getenv("REDIS_SOCKET_TIMEOUT", "1"))
    REDIS_SOCKET_CONNECT_TIMEOUT = float(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "1"))

    CACHE_TTL = int(os.getenv("CACHE_TTL", "86400"))
    STALE_CACHE_TTL = int(os.getenv("STALE_CACHE_TTL", "604800"))
    VALIDATOR_CACHE_TTL = int(os.getenv("VALIDATOR_CACHE_TTL", "604800"))
    MEMORY_CACHE_SIZE = int(os.getenv("MEMORY_CACHE_SIZE", "512"))
    MEMORY_CACHE_TTL = int(os.getenv("MEMORY_CACHE_TTL", "900"))
    MAX_CACHE_PAYLOAD_BYTES = int(os.getenv("MAX_CACHE_PAYLOAD_BYTES", "262144"))

    CONNECT_TIMEOUT = float(os.getenv("CONNECT_TIMEOUT", "5"))
    READ_TIMEOUT = float(os.getenv("READ_TIMEOUT", "15"))
    REQUEST_TIMEOUT = (CONNECT_TIMEOUT, READ_TIMEOUT)
    CONNECTION_POOL_CONNECTIONS = int(os.getenv("CONNECTION_POOL_CONNECTIONS", "10"))
    CONNECTION_POOL_MAXSIZE = int(os.getenv("CONNECTION_POOL_MAXSIZE", "20"))
    RETRY_TOTAL = int(os.getenv("RETRY_TOTAL", "2"))
    RETRY_BACKOFF = float(os.getenv("RETRY_BACKOFF", "0.25"))
    VERIFY_TLS = os.getenv("VERIFY_TLS", "1").strip() != "0"

    MAX_HTML_BYTES = int(os.getenv("MAX_HTML_BYTES", "65536"))
    READ_CHUNK_SIZE = int(os.getenv("READ_CHUNK_SIZE", "2048"))
    MAX_URL_LENGTH = int(os.getenv("MAX_URL_LENGTH", "2048"))

    RATE_LIMIT_PER_IP = int(os.getenv("RATE_LIMIT_PER_IP", "60"))
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
    METRICS_ENABLED = os.getenv("METRICS_ENABLED", "1").strip() != "0"

    ALLOWED_SCHEMES = {"http", "https"}
    BLOCKED_HOSTNAMES = {"localhost"}
    SUPPORTED_PLATFORMS = {
        "youtube",
        "tiktok",
        "instagram",
        "facebook",
        "x",
        "twitter",
        "reddit",
        "pinterest",
        "generic",
    }
    BLOCKED_CONTENT_PREFIXES = ("image/", "video/", "audio/", "font/")
    BLOCKED_CONTENT_TYPES = {
        "text/css",
        "application/font-woff",
        "application/font-woff2",
        "application/octet-stream",
    }
    ALLOWED_CONTENT_TYPES = _csv(
        "ALLOWED_CONTENT_TYPES",
        [
            "text/html",
            "application/json",
            "application/ld+json",
            "text/plain",
        ],
    )
