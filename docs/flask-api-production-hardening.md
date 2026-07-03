python app.pypython app.py# DownloadDash Flask Metadata API Production Notes

## Architecture

The root Flask API is a metadata-only service. It never downloads media files, never streams media, and never proxies media bodies. The request flow is:

1. Validate the submitted URL against SSRF rules.
2. Check in-memory LRU cache.
3. Check Redis cache.
4. Acquire a per-URL lock to prevent duplicate upstream requests.
5. Re-check cache after the lock.
6. Issue a `HEAD` request through the global proxy-aware session.
7. If required, issue a capped streaming `GET` for HTML/JSON metadata only.
8. Cache the result and return structured JSON.

```text
client
  |
  v
Flask /api/v1/extract
  |
  +--> URL/platform validation and SSRF guard
  |
  +--> memory LRU cache
  |
  +--> Redis cache
  |
  +--> per-URL lock
  |
  +--> global requests.Session via proxy
          |
          +--> HEAD
          +--> capped partial GET only for HTML/JSON metadata
```

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PROXY` | empty | Residential proxy URL used by `requests.Session`. |
| `REQUIRE_PROXY` | `0` | If `1`, readiness fails when `PROXY` is missing. |
| `REDIS_URL` | empty | Preferred Redis connection string. |
| `REDIS_HOST` | `localhost` | Redis host fallback. |
| `REDIS_PORT` | `6379` | Redis port fallback. |
| `REDIS_DB` | `0` | Redis DB fallback. |
| `REDIS_PASSWORD` | empty | Redis password fallback. |
| `CACHE_TTL` | `86400` | Primary cache TTL in seconds. |
| `STALE_CACHE_TTL` | `604800` | Stale cache TTL for conditional `304` reuse. |
| `VALIDATOR_CACHE_TTL` | `604800` | ETag/Last-Modified validator TTL. |
| `MEMORY_CACHE_SIZE` | `512` | In-memory LRU size. |
| `MEMORY_CACHE_TTL` | `900` | In-memory LRU TTL in seconds. |
| `MAX_CACHE_PAYLOAD_BYTES` | `262144` | Maximum decompressed Redis cache payload size. |
| `CONNECT_TIMEOUT` | `5` | Upstream connect timeout. |
| `READ_TIMEOUT` | `15` | Upstream read timeout. |
| `CONNECTION_POOL_CONNECTIONS` | `10` | Requests adapter pool count. |
| `CONNECTION_POOL_MAXSIZE` | `20` | Requests adapter max pool size. |
| `RETRY_TOTAL` | `2` | Transient retry count for HEAD/GET only. |
| `RETRY_BACKOFF` | `0.25` | Retry backoff factor. |
| `VERIFY_TLS` | `1` | Keep TLS certificate verification enabled. |
| `MAX_HTML_BYTES` | `65536` | Maximum bytes read from an HTML/JSON body. |
| `READ_CHUNK_SIZE` | `2048` | Streaming body chunk size. |
| `MAX_URL_LENGTH` | `2048` | Maximum accepted URL length. |
| `RATE_LIMIT_PER_IP` | `60` | Requests per IP per window. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate-limit window size. |
| `LOG_LEVEL` | `INFO` | Python log level. |
| `METRICS_ENABLED` | `1` | Enables `/metrics`. |

## API Examples

```bash
curl "https://your-api.example/extract?url=https://example.com/post"
curl "https://your-api.example/api/v1/extract?url=https://example.com/post"
curl "https://your-api.example/extract?platform=generic&url=https://example.com/post"
curl -H "Accept: application/json" "https://your-api.example/metrics"
curl "https://your-api.example/readiness"
curl "https://your-api.example/openapi.json"
curl "https://your-api.example/docs"
curl "https://your-api.example/api/v1/health"
curl "https://your-api.example/api/v1/liveness"
```

All errors are structured JSON:

```json
{"success": false, "error": "Only http and https URLs are supported.", "code": "invalid_input"}
```

## Deployment

Render uses the root Flask service:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT --workers ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-4} --timeout ${GUNICORN_TIMEOUT:-30} --graceful-timeout ${GUNICORN_GRACEFUL_TIMEOUT:-30}
```

Docker is optional:

```bash
docker build -t downloaddash-api .
docker run -p 5000:5000 --env-file .env downloaddash-api
```

Recommended production settings:

- Set `PROXY` and `REQUIRE_PROXY=1`.
- Set `REDIS_URL` to a managed Redis instance.
- Keep `VERIFY_TLS=1`.
- Keep `MAX_HTML_BYTES` at 64 KB unless benchmark data proves a smaller/larger cap is needed.

## Benchmarks

No-upstream cache-path benchmark:

```bash
python scripts/benchmark_api_local.py --iterations 250
```

The local benchmark reports both cold-cache and warm-cache API paths while mocking upstream extraction to avoid proxy spend.

Per-platform upstream benchmark using your own public sample URLs:

```bash
python scripts/benchmark_platform_bandwidth.py sample_urls.csv
```

CSV format:

```csv
platform,url
youtube,https://youtu.be/example
tiktok,https://www.tiktok.com/@user/video/example
```

Load testing:

```bash
k6 run load-tests/k6-metadata-api.js
```

See `docs/load-testing.md` for warm-cache, cold-cache, concurrent-user, and sustained-load examples. Cold-cache tests can create real upstream requests when pointed at real URLs, so use them sparingly with expensive residential proxies.

## Troubleshooting

- `/readiness` returns `503`: Redis is unavailable or `REQUIRE_PROXY=1` without `PROXY`.
- `/extract` returns `400 invalid_input`: URL is malformed, unsupported, internal, too long, or contains credentials/control characters.
- `/extract` returns `415 blocked_content_type`: upstream response is image/video/audio/font/CSS and body fetch was intentionally blocked.
- `/metrics` returns `404`: `METRICS_ENABLED=0`.

## Monitoring Guide

- Scrape `/metrics` for Prometheus text metrics.
- Use `/api/v1/liveness` for process liveness.
- Use `/api/v1/readiness` for Redis/proxy readiness.
- Track `downloaddash_upstream_bytes_total`, `downloaddash_cache_hit_ratio`, `downloaddash_upstream_failures_total`, and `downloaddash_rate_limited_total`.

## Operational Runbook

- High upstream bytes: inspect cache hit ratios and lower `MAX_HTML_BYTES` only after platform benchmarks confirm metadata is still found.
- High upstream failures: verify proxy health, target platform availability, and DNS/security rejection logs.
- Readiness failing: verify `REDIS_URL`, Redis network access, and `REQUIRE_PROXY`/`PROXY`.
- Rate-limit spikes: tune `RATE_LIMIT_PER_IP` and `RATE_LIMIT_WINDOW_SECONDS`.

## Upgrade Guide

1. Update pinned versions in `requirements.txt`.
2. Run `python -m pip install -r requirements.txt -r requirements-dev.txt`.
3. Run unit tests, coverage, Ruff, Bandit, mypy, and pip-audit.
4. Run `python scripts/benchmark_api_local.py --iterations 250`.
5. Deploy to staging with `REQUIRE_PROXY=1` and managed Redis.
6. Verify `/api/v1/readiness`, `/api/v1/metrics`, and representative `/api/v1/extract` requests.

## Release Guide

1. Confirm `git status` contains only intended changes.
2. Commit with a descriptive message.
3. Push to GitHub and wait for `.github/workflows/api-quality.yml`.
4. Deploy Render API and Vercel frontend.
5. Watch cache hit ratio, upstream bytes, upstream failures, and readiness for at least one traffic window.

## CI/CD

The API quality workflow runs unit tests, Ruff, Bandit, mypy, coverage with a 95% threshold, `pip-audit`, and a Docker build on push and pull request.

## Security Model

The API rejects unsafe outbound URLs before any upstream request. It blocks unsupported schemes, credentials, control characters, localhost, internal IPs, and hostnames resolving to internal addresses. It also refuses non-metadata response bodies and caps HTML/JSON reads.

## Production Constraints

This API intentionally does not guarantee direct downloadable media URLs for modern platforms. It extracts only public metadata exposed in lightweight HTML/JSON responses.
