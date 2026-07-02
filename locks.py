import threading
from contextlib import contextmanager

from cache import generate_cache_key


class LockManager:
    def __init__(self):
        self._locks = {}
        self._guard = threading.Lock()

    @contextmanager
    def lock_for(self, url):
        key = generate_cache_key(url)
        with self._guard:
            entry = self._locks.get(key)
            if entry is None:
                entry = {"lock": threading.Lock(), "users": 0}
                self._locks[key] = entry
            entry["users"] += 1

        entry["lock"].acquire()
        try:
            yield
        finally:
            entry["lock"].release()
            with self._guard:
                entry["users"] -= 1
                if entry["users"] == 0:
                    self._locks.pop(key, None)


request_locks = LockManager()
