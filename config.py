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

    REDIS_URL = os.getenv("REDIS_URL", "").strip()
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD") or None

    CACHE_TTL = int(os.getenv("CACHE_TTL", "86400"))
    MEMORY_CACHE_SIZE = int(os.getenv("MEMORY_CACHE_SIZE", "512"))
    MEMORY_CACHE_TTL = int(os.getenv("MEMORY_CACHE_TTL", "900"))

    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "15"))
    CONNECTION_POOL_SIZE = int(os.getenv("CONNECTION_POOL_SIZE", "4"))
    RETRY_TOTAL = int(os.getenv("RETRY_TOTAL", "2"))
    RETRY_BACKOFF = float(os.getenv("RETRY_BACKOFF", "0.25"))

    MAX_HTML_BYTES = int(os.getenv("MAX_HTML_BYTES", "65536"))
    READ_CHUNK_SIZE = int(os.getenv("READ_CHUNK_SIZE", "2048"))

    RATE_LIMIT_PER_IP = int(os.getenv("RATE_LIMIT_PER_IP", "60"))
    RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

    ALLOWED_SCHEMES = {"http", "https"}
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
