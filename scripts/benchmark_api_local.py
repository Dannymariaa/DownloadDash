import argparse
import json
import statistics
import sys
import time
import tracemalloc
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app as api
from config import Config
from rate_limit import reset_rate_limits


BENCHMARK_URL = "https://example.com/post"
BENCHMARK_RESULT = {
    "platform": "generic",
    "url": BENCHMARK_URL,
    "metadata": {"title": "Benchmark", "body_bytes_read": 2048},
    "network_strategy": "benchmark_mock",
}


def _percentile(values, percentile):
    if not values:
        return 0
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((percentile / 100) * (len(ordered) - 1)))
    return ordered[index]


def _report(name, iterations, latencies, wall_seconds, cpu_seconds, peak_bytes, cache_hits):
    return {
        "scenario": name,
        "iterations": iterations,
        "average_latency_ms": round(statistics.mean(latencies), 3),
        "p95_latency_ms": round(_percentile(latencies, 95), 3),
        "p99_latency_ms": round(_percentile(latencies, 99), 3),
        "requests_per_second": round(iterations / wall_seconds, 2) if wall_seconds else 0,
        "cache_hit_ratio": round(cache_hits / iterations, 4) if iterations else 0,
        "upstream_requests": 0,
        "average_upstream_bytes": 0,
        "bandwidth_saved_bytes": cache_hits * BENCHMARK_RESULT["metadata"]["body_bytes_read"],
        "memory_peak_kb": round(peak_bytes / 1024, 3),
        "cpu_seconds": round(cpu_seconds, 3),
        "cpu_utilization_estimate": round(cpu_seconds / wall_seconds, 4) if wall_seconds else 0,
    }


def _run_scenario(name, iterations, cache_hit):
    reset_rate_limits()
    client = api.app.test_client()
    latencies = []
    cache_hits = 0

    if cache_hit:
        cache_value = (BENCHMARK_RESULT, "memory")
    else:
        cache_value = (None, "miss")

    tracemalloc.start()
    cpu_start = time.process_time()
    wall_start = time.monotonic()

    with patch.object(Config, "RATE_LIMIT_PER_IP", iterations + 1), patch.object(
        api, "validate_public_url", return_value=BENCHMARK_URL
    ), patch.object(api, "get_cache", return_value=cache_value), patch.object(
        api, "extract_metadata", return_value=BENCHMARK_RESULT
    ), patch.object(api, "set_cache"):
        for _ in range(iterations):
            started = time.monotonic()
            response = client.get(f"/api/v1/extract?url={BENCHMARK_URL}")
            if response.status_code != 200:
                raise RuntimeError(f"Unexpected status: {response.status_code}")
            payload = response.get_json()
            cache_hits += int(bool(payload.get("cached")))
            latencies.append((time.monotonic() - started) * 1000)

    wall_seconds = time.monotonic() - wall_start
    cpu_seconds = time.process_time() - cpu_start
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    return _report(name, iterations, latencies, wall_seconds, cpu_seconds, peak, cache_hits)


def run(iterations):
    return {
        "cold_cache": _run_scenario("cold_cache", iterations, cache_hit=False),
        "warm_cache": _run_scenario("warm_cache", iterations, cache_hit=True),
    }


def main():
    parser = argparse.ArgumentParser(description="Run local no-upstream cold/warm API benchmarks.")
    parser.add_argument("--iterations", type=int, default=250)
    args = parser.parse_args()
    print(json.dumps(run(args.iterations), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
