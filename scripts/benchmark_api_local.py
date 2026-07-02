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


def _percentile(values, percentile):
    if not values:
        return 0
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((percentile / 100) * (len(ordered) - 1)))
    return ordered[index]


def run(iterations):
    reset_rate_limits()
    client = api.app.test_client()
    cached = {
        "platform": "generic",
        "url": "https://example.com/post",
        "metadata": {"title": "Benchmark", "body_bytes_read": 2048},
    }
    latencies = []

    tracemalloc.start()
    cpu_start = time.process_time()
    wall_start = time.monotonic()

    with patch.object(Config, "RATE_LIMIT_PER_IP", iterations + 1), patch.object(
        api, "validate_public_url", return_value="https://example.com/post"
    ), patch.object(api, "get_cache", return_value=(cached, "memory")):
        for _ in range(iterations):
            started = time.monotonic()
            response = client.get("/extract?url=https://example.com/post")
            if response.status_code != 200:
                raise RuntimeError(f"Unexpected status: {response.status_code}")
            latencies.append((time.monotonic() - started) * 1000)

    wall_seconds = time.monotonic() - wall_start
    cpu_seconds = time.process_time() - cpu_start
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    report = api.metrics.get_report()
    return {
        "iterations": iterations,
        "average_latency_ms": round(statistics.mean(latencies), 3),
        "p95_latency_ms": round(_percentile(latencies, 95), 3),
        "p99_latency_ms": round(_percentile(latencies, 99), 3),
        "requests_per_second": round(iterations / wall_seconds, 2) if wall_seconds else 0,
        "cache_hit_ratio": report["memory_cache_hit_rate"],
        "average_bytes_transferred": report["average_bytes_per_upstream_request"],
        "bandwidth_saved_bytes": report["proxy_bandwidth_saved_bytes_due_to_caching"],
        "memory_peak_kb": round(peak / 1024, 3),
        "cpu_seconds": round(cpu_seconds, 3),
        "cpu_utilization_estimate": round(cpu_seconds / wall_seconds, 4) if wall_seconds else 0,
    }


def main():
    parser = argparse.ArgumentParser(description="Run a local no-upstream API cache benchmark.")
    parser.add_argument("--iterations", type=int, default=250)
    args = parser.parse_args()
    print(json.dumps(run(args.iterations), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
