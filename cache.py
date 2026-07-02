import hashlib
import gzip
import json
import threading
import time
from collections import OrderedDict

import redis

from config import Config
from metrics import metrics
from utils.logger import logger


class MemoryLRU:
    def __init__(self, maxsize, ttl):
        self.maxsize = maxsize
        self.ttl = ttl
        self._items = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key):
        now = time.time()
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None
            expires_at, value = item
            if expires_at <= now:
                self._items.pop(key, None)
                return None
            self._items.move_to_end(key)
            return value

    def set(self, key, value):
        with self._lock:
            self._items[key] = (time.time() + self.ttl, value)
            self._items.move_to_end(key)
            while len(self._items) > self.maxsize:
                self._items.popitem(last=False)


def generate_cache_key(url):
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _redis_key(prefix, url):
    return f"{prefix}:{generate_cache_key(url)}"


def _pack(data):
    raw = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return gzip.compress(raw, compresslevel=6)


def _unpack(payload):
    try:
        if isinstance(payload, str):
            return json.loads(payload)
        return json.loads(gzip.decompress(payload).decode("utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError("Cached payload is invalid.") from exc


def _recorded_redis_call(operation):
    started = time.monotonic()
    try:
        return operation()
    finally:
        metrics.record_redis_latency((time.monotonic() - started) * 1000)


def _redis_client():
    try:
        if Config.REDIS_URL:
            client = redis.Redis.from_url(Config.REDIS_URL, decode_responses=False)
        else:
            client = redis.Redis(
                host=Config.REDIS_HOST,
                port=Config.REDIS_PORT,
                db=Config.REDIS_DB,
                password=Config.REDIS_PASSWORD,
                socket_connect_timeout=Config.REDIS_SOCKET_CONNECT_TIMEOUT,
                socket_timeout=Config.REDIS_SOCKET_TIMEOUT,
                decode_responses=False,
            )
        client.ping()
        return client
    except redis.RedisError as exc:
        logger.warning("redis unavailable, using memory cache only: %s", exc)
        return None


redis_client = _redis_client()
memory_cache = MemoryLRU(Config.MEMORY_CACHE_SIZE, Config.MEMORY_CACHE_TTL)


def get_cache(url):
    key = generate_cache_key(url)

    cached = memory_cache.get(key)
    if cached is not None:
        return json.loads(cached), "memory"

    if redis_client is None:
        return None, "miss"

    try:
        cached = _recorded_redis_call(lambda: redis_client.get(key))
    except (redis.RedisError, ValueError) as exc:
        logger.warning("redis get failed: %s", exc)
        return None, "miss"

    if cached is None:
        return None, "miss"

    memory_cache.set(key, cached)
    try:
        return _unpack(cached), "redis"
    except ValueError as exc:
        logger.warning("redis cached payload rejected: %s", exc)
        return None, "miss"


def set_cache(url, data):
    key = generate_cache_key(url)
    payload = json.dumps(data, separators=(",", ":"), sort_keys=True)
    memory_cache.set(key, payload)

    if redis_client is None:
        return

    try:
        compressed = _pack(data)
        _recorded_redis_call(lambda: redis_client.setex(key, Config.CACHE_TTL, compressed))
        _recorded_redis_call(
            lambda: redis_client.setex(_redis_key("stale", url), Config.STALE_CACHE_TTL, compressed)
        )
    except redis.RedisError as exc:
        logger.warning("redis set failed: %s", exc)


def get_stale_cache(url):
    cached = memory_cache.get(generate_cache_key(url))
    if cached is not None:
        return json.loads(cached)

    if redis_client is None:
        return None

    try:
        cached = _recorded_redis_call(lambda: redis_client.get(_redis_key("stale", url)))
    except redis.RedisError as exc:
        logger.warning("redis stale get failed: %s", exc)
        return None

    if cached is None:
        return None
    try:
        return _unpack(cached)
    except ValueError as exc:
        logger.warning("redis stale payload rejected: %s", exc)
        return None


def get_validators(url):
    if redis_client is None:
        return {}
    try:
        cached = _recorded_redis_call(lambda: redis_client.get(_redis_key("validator", url)))
    except redis.RedisError as exc:
        logger.warning("redis validator get failed: %s", exc)
        return {}
    if cached is None:
        return {}
    try:
        return _unpack(cached)
    except ValueError as exc:
        logger.warning("redis validator payload rejected: %s", exc)
        return {}


def set_validators(url, validators):
    validators = {key: value for key, value in validators.items() if value}
    if not validators or redis_client is None:
        return
    try:
        _recorded_redis_call(
            lambda: redis_client.setex(
                _redis_key("validator", url),
                Config.VALIDATOR_CACHE_TTL,
                _pack(validators),
            )
        )
    except redis.RedisError as exc:
        logger.warning("redis validator set failed: %s", exc)


def redis_health():
    if redis_client is None:
        return {"ok": False, "configured": False, "latency_ms": None}
    started = time.monotonic()
    try:
        redis_client.ping()
    except redis.RedisError as exc:
        return {"ok": False, "configured": True, "latency_ms": None, "error": str(exc)}
    latency = (time.monotonic() - started) * 1000
    metrics.record_redis_latency(latency)
    return {"ok": True, "configured": True, "latency_ms": round(latency, 2)}
