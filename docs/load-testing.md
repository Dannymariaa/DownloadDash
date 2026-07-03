# Load Testing Guide

The load tests are intentionally external to the application. They do not add browser automation, media downloading, or stream proxying to the production API.

## Prerequisites

Install k6 locally:

```bash
choco install k6
```

or follow the official k6 installation instructions for your OS.

## Warm Cache

Warm-cache tests reuse the same submitted URL and should mostly exercise memory/Redis cache paths after the first request.

```bash
k6 run load-tests/k6-metadata-api.js -e BASE_URL=http://localhost:5000 -e TARGET_URL=https://example.com/post -e MODE=warm -e VUS=25 -e DURATION=5m
```

## Cold Cache

Cold-cache tests vary the submitted URL with a query parameter. Use this sparingly in production-like environments because it intentionally defeats cache reuse and can increase proxy usage.

```bash
k6 run load-tests/k6-metadata-api.js -e BASE_URL=http://localhost:5000 -e TARGET_URL=https://example.com/post -e MODE=cold -e VUS=5 -e DURATION=1m
```

## Sustained Load

```bash
k6 run load-tests/k6-metadata-api.js -e BASE_URL=https://your-api.example -e TARGET_URL=https://example.com/post -e MODE=warm -e VUS=50 -e DURATION=30m
```

## What To Watch

- `downloaddash_cache_hit_ratio`
- `downloaddash_upstream_bytes_total`
- `downloaddash_upstream_failures_total`
- `downloaddash_rate_limited_total`
- `downloaddash_process_memory_bytes`
- `/readiness`

Expected behavior for warm-cache tests:

- Cache hit ratio approaches 1.0.
- Upstream bytes remain near zero after warmup.
- p95 latency remains below the k6 threshold unless Redis/proxy infrastructure is degraded.
