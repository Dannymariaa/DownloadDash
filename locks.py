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
            lock = self._locks.get(key)
            if lock is None:
                lock = threading.Lock()
                self._locks[key] = lock

        lock.acquire()
        try:
            yield
        finally:
            lock.release()


request_locks = LockManager()
