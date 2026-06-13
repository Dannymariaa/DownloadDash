import hashlib
import json
import os
from dotenv import load_dotenv
import redis

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
_cache_client = redis.from_url(REDIS_URL, decode_responses=True)


def make_cache_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_cache(key: str):
    try:
        raw = _cache_client.get(key)
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_cache(key: str, value, ttl: int = 86400):
    try:
        _cache_client.set(key, json.dumps(value, ensure_ascii=False), ex=ttl)
    except Exception:
        pass
