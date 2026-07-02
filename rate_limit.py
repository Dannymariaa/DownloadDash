import time
from functools import wraps
from threading import Lock

from flask import jsonify, request

from config import Config
from metrics import metrics

_buckets = {}
_lock = Lock()


def _client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    return request.remote_addr or "unknown"


def rate_limit(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        now = time.time()
        ip = _client_ip()
        window_start = now - Config.RATE_LIMIT_WINDOW_SECONDS

        with _lock:
            hits = [ts for ts in _buckets.get(ip, []) if ts > window_start]
            if len(hits) >= Config.RATE_LIMIT_PER_IP:
                _buckets[ip] = hits
                metrics.record_error()
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": "Rate limit exceeded. Try again later.",
                            "code": "rate_limit_exceeded",
                        }
                    ),
                    429,
                )
            hits.append(now)
            _buckets[ip] = hits

        return func(*args, **kwargs)

    return wrapper


def reset_rate_limits():
    with _lock:
        _buckets.clear()
