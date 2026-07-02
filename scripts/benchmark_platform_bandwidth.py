import argparse
import csv
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from downloader import extract_metadata
from metrics import metrics


def _snapshot():
    report = metrics.get_report()
    return {
        "requests": report["upstream_requests"],
        "bytes": report["total_bytes"],
        "latency": report["average_latency_ms_per_upstream_request"]
        * report["upstream_requests"],
    }


def _delta(before, after):
    requests = after["requests"] - before["requests"]
    bytes_downloaded = after["bytes"] - before["bytes"]
    latency_ms = after["latency"] - before["latency"]
    return requests, bytes_downloaded, latency_ms


def _load_urls(path):
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            platform = (row.get("platform") or "").strip()
            url = (row.get("url") or "").strip()
            if platform and url:
                yield platform, url


def run_benchmark(rows):
    results = []
    for expected_platform, url in rows:
        before = _snapshot()
        started = time.monotonic()
        success = True
        error = ""
        cacheable = True
        actual_platform = expected_platform

        try:
            result = extract_metadata(url)
            actual_platform = result.get("platform") or expected_platform
            cacheable = bool(result.get("metadata"))
        except Exception as exc:
            success = False
            error = str(exc)

        after = _snapshot()
        requests, bytes_downloaded, latency_ms = _delta(before, after)
        wall_time_ms = (time.monotonic() - started) * 1000
        avg_time_ms = latency_ms / requests if requests else wall_time_ms

        results.append(
            {
                "platform": actual_platform,
                "url": url,
                "success": success,
                "requests": requests,
                "bytes_downloaded": bytes_downloaded,
                "kb_downloaded": round(bytes_downloaded / 1024, 3),
                "cacheable": cacheable,
                "avg_time_ms": round(avg_time_ms, 2),
                "error": error,
            }
        )
    return results


def _print_markdown(results):
    print("| Platform | Requests | Bytes Downloaded | KB | Cacheable | Avg Time | Success |")
    print("| --- | ---: | ---: | ---: | --- | ---: | --- |")
    for row in results:
        print(
            "| {platform} | {requests} | {bytes_downloaded} | {kb_downloaded} | {cacheable} | {avg_time_ms} ms | {success} |".format(
                **row
            )
        )


def main():
    parser = argparse.ArgumentParser(
        description="Measure upstream request count, bytes, and latency per platform URL."
    )
    parser.add_argument(
        "input",
        help="CSV with columns: platform,url",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print JSON instead of a Markdown table.",
    )
    args = parser.parse_args()

    results = run_benchmark(_load_urls(args.input))
    if args.json:
        print(json.dumps(results, indent=2, sort_keys=True))
    else:
        _print_markdown(results)


if __name__ == "__main__":
    main()
