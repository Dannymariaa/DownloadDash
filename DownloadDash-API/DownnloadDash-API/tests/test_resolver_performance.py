import asyncio
import json
import time
import tracemalloc
import unittest
from unittest.mock import patch

from app.api.shared import _resolve_cache, _resolve_inflight, _resolve_public_metadata
from app.config import settings
from app.models.schemas import DownloadRequest, Platform, Quality
from app.platforms.public_platforms import PublicPlatformDownloader


def make_request(url: str) -> DownloadRequest:
    return DownloadRequest(url=url, platform=Platform.TIKTOK, quality=Quality.HIGHEST)


class ResolverPerformanceTests(unittest.TestCase):
    def setUp(self):
        _resolve_cache.clear()
        _resolve_inflight.clear()

    def test_identical_mocked_url_load_uses_one_provider_call(self):
        async def main():
            results = {}
            for size in (10, 50, 100, 500, 1000):
                _resolve_inflight.clear()
                request = make_request("https://www.tiktok.com/@creator/video/shared")
                calls = 0
                latencies = []

                class Stub:
                    async def resolve_media(self, **kwargs):
                        nonlocal calls
                        calls += 1
                        await asyncio.sleep(0.01)
                        return {"direct_url": "https://cdn.example/video.mp4", "kind": "video"}

                key = f"load-identical-{size}"
                tracemalloc.start()
                cpu_started = time.process_time()
                started = time.perf_counter()
                with patch("app.api.shared.universal_downloader", Stub()):
                    await asyncio.gather(*(
                        measure(_resolve_public_metadata, request, key, latencies)
                        for _ in range(size)
                    ))
                elapsed = time.perf_counter() - started
                cpu = time.process_time() - cpu_started
                _, peak = tracemalloc.get_traced_memory()
                tracemalloc.stop()
                ordered = sorted(latencies)
                results[str(size)] = {
                    "providerCalls": calls,
                    "throughputPerSecond": round(size / elapsed, 2),
                    "p50Ms": percentile(ordered, 0.50),
                    "p95Ms": percentile(ordered, 0.95),
                    "p99Ms": percentile(ordered, 0.99),
                    "failures": 0 if calls == 1 else size,
                    "peakMemoryBytes": peak,
                    "cpuSeconds": round(cpu, 4),
                }
            print("SYNTHETIC_IDENTICAL_LOAD=" + json.dumps(results, sort_keys=True))

        asyncio.run(main())

    def test_unique_mocked_urls_respect_resolver_limit(self):
        async def main():
            active = 0
            maximum = 0
            calls = 0

            class Stub:
                async def resolve_media(self, **kwargs):
                    nonlocal active, maximum, calls
                    calls += 1
                    active += 1
                    maximum = max(maximum, active)
                    await asyncio.sleep(0.005)
                    active -= 1
                    return {"direct_url": "https://cdn.example/video.mp4", "kind": "video"}

            limit = settings.RESOLVER_CONCURRENCY
            started = time.perf_counter()
            with patch("app.api.shared.universal_downloader", Stub()):
                await asyncio.gather(*(
                    _resolve_public_metadata(
                        platform=Platform.TIKTOK,
                        request=make_request(f"https://www.tiktok.com/@creator/video/{index}"),
                        cache_key=f"unique-{index}",
                    )
                    for index in range(100)
                ))
            elapsed = time.perf_counter() - started
            self.assertEqual(calls, 100)
            self.assertLessEqual(maximum, limit)
            print(json.dumps({"uniqueUrls": 100, "configuredLimit": limit, "maximumObserved": maximum,
                              "failures": 0, "elapsedSeconds": round(elapsed, 4)}))

        asyncio.run(main())

    def test_heavy_transfers_obey_their_separate_semaphore(self):
        async def main():
            downloader = PublicPlatformDownloader()
            active = 0
            maximum = 0

            async def slow_transfer(*args, **kwargs):
                nonlocal active, maximum
                active += 1
                maximum = max(maximum, active)
                await asyncio.sleep(0.005)
                active -= 1
                return {"path": "unused"}

            downloader._download_platform_variant_unlocked = slow_transfer
            with patch("app.platforms.public_platforms.settings.HEAVY_MEDIA_CONCURRENCY", 1):
                await asyncio.gather(*(
                    downloader.download_platform_variant(f"https://example.test/{index}", "hd")
                    for index in range(10)
                ))
            self.assertEqual(maximum, 1)

        asyncio.run(main())

    def test_timed_out_metadata_job_keeps_resolver_slot_until_work_exits(self):
        async def main():
            active = 0
            maximum = 0

            class SlowStub:
                async def resolve_media(self, **kwargs):
                    nonlocal active, maximum
                    active += 1
                    maximum = max(maximum, active)
                    await asyncio.sleep(0.06)
                    active -= 1
                    return {"direct_url": "https://cdn.example/video.mp4", "kind": "video"}

            request_a = make_request("https://www.tiktok.com/@creator/video/timeout-a")
            request_b = make_request("https://www.tiktok.com/@creator/video/timeout-b")
            with patch("app.api.shared.settings.RESOLVER_CONCURRENCY", 1), \
                 patch("app.api.shared.settings.RESOLVER_TIMEOUT_SECONDS", 0.01), \
                 patch("app.api.shared.universal_downloader", SlowStub()):
                first = await _resolve_public_metadata(
                    platform=Platform.TIKTOK, request=request_a, cache_key="timeout-a"
                )
                second_task = asyncio.create_task(_resolve_public_metadata(
                    platform=Platform.TIKTOK, request=request_b, cache_key="timeout-b"
                ))
                await asyncio.sleep(0.005)
                self.assertEqual(active, 1)
                second = await second_task
                await asyncio.sleep(0.07)
            self.assertIsNotNone(first[1])
            self.assertIsNotNone(second[1])
            self.assertEqual(maximum, 1)

        asyncio.run(main())

    def test_heavy_media_slot_does_not_block_metadata_resolution(self):
        async def main():
            downloader = PublicPlatformDownloader()
            heavy_started = asyncio.Event()
            finish_heavy = asyncio.Event()

            async def slow_transfer(*args, **kwargs):
                heavy_started.set()
                await finish_heavy.wait()
                return {"path": "unused"}

            downloader._download_platform_variant_unlocked = slow_transfer
            with patch("app.platforms.public_platforms.settings.HEAVY_MEDIA_CONCURRENCY", 1):
                heavy = asyncio.create_task(downloader.download_platform_variant("https://example.test/video", "hd"))
                await heavy_started.wait()

            calls = 0

            class Stub:
                async def resolve_media(self, **kwargs):
                    nonlocal calls
                    calls += 1
                    return {"direct_url": "https://cdn.example/video.mp4", "kind": "video"}

            with patch("app.api.shared.universal_downloader", Stub()):
                result = await asyncio.wait_for(
                    _resolve_public_metadata(
                        platform=Platform.TIKTOK,
                        request=make_request("https://www.tiktok.com/@creator/video/metadata"),
                        cache_key="metadata-with-heavy-active",
                    ),
                    timeout=0.5,
                )
            finish_heavy.set()
            await heavy
            self.assertEqual(calls, 1)
            self.assertIsNotNone(result[0])

        asyncio.run(main())


async def measure(resolver, request, key, latencies):
    started = time.perf_counter()
    await resolver(platform=Platform.TIKTOK, request=request, cache_key=key)
    latencies.append((time.perf_counter() - started) * 1000)


def percentile(values, fraction):
    if not values:
        return 0
    return round(values[min(len(values) - 1, int((len(values) - 1) * fraction))], 2)
