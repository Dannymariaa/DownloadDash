# DownloadDash Flask Metadata API Production Notes

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
curl "https://your-api.example/extract?platform=generic&url=https://example.com/post"
curl -H "Accept: application/json" "https://your-api.example/metrics"
curl "https://your-api.example/readiness"
```

All errors are structured JSON:

```json
{"success": false, "error": "Only http and https URLs are supported.", "code": "invalid_input"}
```

## Deployment

Render uses the root Flask service:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 30
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

## Troubleshooting

- `/readiness` returns `503`: Redis is unavailable or `REQUIRE_PROXY=1` without `PROXY`.
- `/extract` returns `400 invalid_input`: URL is malformed, unsupported, internal, too long, or contains credentials/control characters.
- `/extract` returns `415 blocked_content_type`: upstream response is image/video/audio/font/CSS and body fetch was intentionally blocked.
- `/metrics` returns `404`: `METRICS_ENABLED=0`.

## Production Constraints

This API intentionally does not guarantee direct downloadable media URLs for modern platforms. It extracts only public metadata exposed in lightweight HTML/JSON responses.
