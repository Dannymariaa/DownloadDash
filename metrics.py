import threading
import time
import tracemalloc

tracemalloc.start()


class Metrics:
    def __init__(self):
        self._lock = threading.Lock()
        self.started_at = time.time()
        self.total_bytes = 0
        self.upstream_requests = 0
        self.upstream_failures = 0
        self.api_requests = 0
        self.redis_hits = 0
        self.redis_misses = 0
        self.memory_hits = 0
        self.memory_misses = 0
        self.errors = 0
        self.platform_bytes = {}
        self.platform_upstream_requests = {}
        self.total_latency_ms = 0
        self.platform_latency_ms = {}
        self.cache_saved_bytes = 0
        self.redis_operations = 0
        self.redis_latency_ms = 0
        self.rate_limited = 0

    def record_api_request(self):
        with self._lock:
            self.api_requests += 1

    def record_upstream(self, platform, bytes_transferred, latency_ms=0):
        with self._lock:
            self.upstream_requests += 1
            self.total_bytes += bytes_transferred
            self.total_latency_ms += latency_ms
            self.platform_bytes[platform] = self.platform_bytes.get(platform, 0) + bytes_transferred
            self.platform_latency_ms[platform] = (
                self.platform_latency_ms.get(platform, 0) + latency_ms
            )
            self.platform_upstream_requests[platform] = (
                self.platform_upstream_requests.get(platform, 0) + 1
            )

    def record_upstream_failure(self):
        with self._lock:
            self.upstream_failures += 1

    def record_cache_hit(self, cache_type, estimated_saved_bytes=0):
        with self._lock:
            if cache_type == "memory":
                self.memory_hits += 1
            elif cache_type == "redis":
                self.redis_hits += 1
            self.cache_saved_bytes += max(0, int(estimated_saved_bytes or 0))

    def record_cache_miss(self):
        with self._lock:
            self.memory_misses += 1
            self.redis_misses += 1

    def record_error(self):
        with self._lock:
            self.errors += 1

    def record_rate_limited(self):
        with self._lock:
            self.rate_limited += 1

    def record_redis_latency(self, latency_ms):
        with self._lock:
            self.redis_operations += 1
            self.redis_latency_ms += latency_ms

    def get_report(self):
        with self._lock:
            platforms = sorted(
                set(self.platform_bytes) | set(self.platform_upstream_requests)
            )
            redis_total = self.redis_hits + self.redis_misses
            memory_total = self.memory_hits + self.memory_misses
            current_memory, peak_memory = tracemalloc.get_traced_memory()
            return {
                "uptime_seconds": round(time.time() - self.started_at, 3),
                "total_bytes": self.total_bytes,
                "total_kb": round(self.total_bytes / 1024, 3),
                "total_mb": round(self.total_bytes / (1024 * 1024), 6),
                "api_requests": self.api_requests,
                "errors": self.errors,
                "rate_limited": self.rate_limited,
                "upstream_requests": self.upstream_requests,
                "upstream_failures": self.upstream_failures,
                "average_bytes_per_upstream_request": round(
                    self.total_bytes / self.upstream_requests, 2
                )
                if self.upstream_requests
                else 0,
                "average_latency_ms_per_upstream_request": round(
                    self.total_latency_ms / self.upstream_requests, 2
                )
                if self.upstream_requests
                else 0,
                "redis_hit_rate": round(self.redis_hits / redis_total, 4)
                if redis_total
                else 0,
                "memory_cache_hit_rate": round(self.memory_hits / memory_total, 4)
                if memory_total
                else 0,
                "average_redis_latency_ms": round(
                    self.redis_latency_ms / self.redis_operations, 2
                )
                if self.redis_operations
                else 0,
                "redis_operations": self.redis_operations,
                "process_memory_bytes": current_memory,
                "process_memory_peak_bytes": peak_memory,
                "proxy_bandwidth_saved_bytes_due_to_caching": self.cache_saved_bytes,
                "proxy_bandwidth_saved_kb_due_to_caching": round(
                    self.cache_saved_bytes / 1024, 3
                ),
                "average_bytes_per_platform": {
                    platform: round(
                        self.platform_bytes.get(platform, 0)
                        / self.platform_upstream_requests.get(platform, 1),
                        2,
                    )
                    for platform in platforms
                },
                "average_latency_ms_per_platform": {
                    platform: round(
                        self.platform_latency_ms.get(platform, 0)
                        / self.platform_upstream_requests.get(platform, 1),
                        2,
                    )
                    for platform in platforms
                },
                "platforms": {
                    platform: {
                        "bytes": self.platform_bytes.get(platform, 0),
                        "upstream_requests": self.platform_upstream_requests.get(
                            platform, 0
                        ),
                        "average_latency_ms": round(
                            self.platform_latency_ms.get(platform, 0)
                            / self.platform_upstream_requests.get(platform, 1),
                            2,
                        ),
                    }
                    for platform in platforms
                },
            }


metrics = Metrics()
