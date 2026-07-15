import os
import time
import uuid
import re
from functools import wraps

from flask import Flask, Response, g, jsonify, request
from dotenv import load_dotenv

from cache import get_cache, redis_health, set_cache
from config import Config
from downloader import UpstreamBlocked, detect_platform, extract_metadata
from locks import request_locks
from metrics import metrics
from rate_limit import rate_limit
from security import SecurityValidationError, validate_public_url
from utils.logger import logger

load_dotenv()

app = Flask(__name__)

logger.info(
    "startup_proxy_audit endpoint=/api/v1/extract policy=direct_first_proxy_fallback proxy_configured=%s expected_proxy_bandwidth=metadata_head_or_partial_html_only endpoints_never_proxy_media=/api/v1/extract_metadata_only",
    bool(Config.PROXY_URL),
)

# --- FIX: Platform mapping for consistent API routing ---
PLATFORM_MAP = {
    'youtube': 'youtube',
    'instagram': 'instagram',
    'tiktok': 'tiktok',
    'facebook': 'facebook',
    'pinterest': 'pinterest',
    'reddit': 'reddit',
    'x': 'x',
    'twitter': 'x',
    'telegram': 'telegram'
}

# --- FIX: Authentication helper using DOWNLOADDASH_API_KEY ---
def authenticate_request():
    """Check if the request has a valid DOWNLOADDASH_API_KEY"""
    api_key = request.headers.get('DOWNLOADDASH_API_KEY', '').strip()
    expected_key = os.environ.get('DOWNLOADDASH_API_KEY', '').strip()
    
    if not expected_key:
        # If no API key is configured, allow all requests (development mode)
        logger.warning("DOWNLOADDASH_API_KEY not configured in environment")
        return True
    
    if not api_key:
        logger.warning("Missing DOWNLOADDASH_API_KEY header")
        return False
    
    return api_key == expected_key

# --- FIX: Authentication middleware ---
@app.before_request
def check_auth():
    """Verify authentication for all protected endpoints"""
    # Skip auth for public endpoints
    public_endpoints = [
        '/', 
        '/health', 
        '/liveness', 
        '/readiness', 
        '/docs', 
        '/openapi.json',
        '/api/v1/health',
        '/api/v1/liveness', 
        '/api/v1/readiness',
        '/api/v1/docs',
        '/api/v1/openapi.json',
        '/metrics',
        '/api/v1/metrics'
    ]
    
    if request.path in public_endpoints:
        return
    
    if request.method == 'OPTIONS':
        return
    
    # Check authentication
    if not authenticate_request():
        logger.warning(
            "request_id=%s event=auth_failed path=%s ip=%s",
            g.get('request_id', '-'),
            request.path,
            request.headers.get('X-Forwarded-For', request.remote_addr)
        )
        return jsonify({
            "success": False,
            "message": "Invalid or missing DOWNLOADDASH_API_KEY",
            "error": "AUTH_FAILED",
            "tip": "Make sure you are sending the DOWNLOADDASH_API_KEY header with your request"
        }), 403

def _json_error(message, status=400, code="bad_request"):
    metrics.record_error()
    return jsonify({"success": False, "error": message, "code": code}), status

def _validate_platform(value):
    if value is None or value == "":
        return None
    platform = value.strip().lower()
    # --- FIX: Map platform aliases ---
    mapped_platform = PLATFORM_MAP.get(platform)
    if mapped_platform and mapped_platform in Config.SUPPORTED_PLATFORMS:
        return mapped_platform
    if platform in Config.SUPPORTED_PLATFORMS:
        return platform
    raise ValueError("Unsupported platform.")

@app.before_request
def attach_request_context():
    request_id = request.headers.get("X-Request-ID", "").strip()
    correlation_id = request.headers.get("X-Correlation-ID", "").strip()
    g.request_id = request_id[:128] if request_id else str(uuid.uuid4())
    g.correlation_id = correlation_id[:128] if correlation_id else g.request_id
    g.started_at = time.monotonic()

@app.after_request
def log_request(response):
    elapsed_ms = (time.monotonic() - g.get("started_at", time.monotonic())) * 1000
    response.headers["X-Request-ID"] = g.get("request_id", "-")
    response.headers["X-Correlation-ID"] = g.get("correlation_id", "-")
    logger.info(
        "request_id=%s correlation_id=%s event=http method=%s path=%s status=%s time_ms=%.2f remote_addr=%s",
        g.get("request_id", "-"),
        g.get("correlation_id", "-"),
        request.method,
        request.path,
        response.status_code,
        elapsed_ms,
        request.headers.get("X-Forwarded-For", request.remote_addr),
    )
    return response

@app.route("/", methods=["GET"])
def home():
    return jsonify(
        {
            "success": True,
            "service": "DownloadDash metadata API",
            "mode": "bandwidth_optimized_metadata_only",
        }
    )

@app.route("/health", methods=["GET"])
@app.route("/api/v1/health", methods=["GET"])
def health():
    return jsonify({"success": True, "status": "healthy"})

@app.route("/liveness", methods=["GET"])
@app.route("/api/v1/liveness", methods=["GET"])
def liveness():
    return jsonify({"success": True, "status": "alive"})

@app.route("/readiness", methods=["GET"])
@app.route("/api/v1/readiness", methods=["GET"])
def readiness():
    redis_status = redis_health()
    proxy_configured = bool(Config.PROXY_URL)
    ready = redis_status["ok"] and (proxy_configured or not Config.REQUIRE_PROXY)
    status = 200 if ready else 503
    return (
        jsonify(
            {
                "success": ready,
                "status": "ready" if ready else "not_ready",
                "redis": redis_status,
                "proxy": {
                    "configured": proxy_configured,
                    "required": Config.REQUIRE_PROXY,
                },
            }
        ),
        status,
    )

def _openapi_spec():
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "DownloadDash Metadata API",
            "version": "1.0.0",
            "description": "Bandwidth-first metadata-only API. It never downloads, streams, or proxies media files.",
        },
        "paths": {
            "/api/v1/extract": {
                "get": {
                    "summary": "Extract public metadata from a URL",
                    "parameters": [
                        {
                            "name": "url",
                            "in": "query",
                            "required": True,
                            "schema": {"type": "string", "format": "uri"},
                        },
                        {
                            "name": "platform",
                            "in": "query",
                            "required": False,
                            "schema": {
                                "type": "string",
                                "enum": sorted(Config.SUPPORTED_PLATFORMS),
                            },
                        },
                    ],
                    "responses": {
                        "200": {"description": "Metadata response"},
                        "400": {"description": "Invalid input"},
                        "415": {"description": "Blocked non-metadata content type"},
                        "429": {"description": "Rate limited"},
                        "500": {"description": "Internal error"},
                    },
                }
            },
            "/api/v1/readiness": {"get": {"summary": "Readiness probe", "responses": {"200": {"description": "Ready"}, "503": {"description": "Not ready"}}}},
            "/api/v1/liveness": {"get": {"summary": "Liveness probe", "responses": {"200": {"description": "Alive"}}}},
            "/metrics": {"get": {"summary": "Prometheus metrics", "responses": {"200": {"description": "Metrics"}}}},
        },
    }

@app.route("/openapi.json", methods=["GET", "POST", "OPTIONS"])
@app.route("/api/v1/openapi.json", methods=["GET", "POST", "OPTIONS"])
def openapi():
    if request.method == "OPTIONS":
        return "", 204
    return jsonify(_openapi_spec())

@app.route("/docs", methods=["GET", "OPTIONS"])
@app.route("/api/v1/docs", methods=["GET", "OPTIONS"])
def swagger_docs():
    if request.method == "OPTIONS":
        return "", 204
        
    html = """<!doctype html>
<html>
<head>
  <title>DownloadDash Metadata API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({url: '/openapi.json', dom_id: '#swagger-ui'});</script>
</body>
</html>"""
    return Response(html, mimetype="text/html")

# --- FIX: Main extraction endpoint with improved platform handling ---
@app.route("/extract", methods=["GET", "POST"])
@app.route("/api/v1/extract", methods=["GET", "POST"])
@rate_limit
def extract_media():
    metrics.record_api_request()
    
    raw_url = None
    raw_platform = None

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        raw_url = payload.get("url")
        raw_platform = payload.get("platform")
    else:
        raw_url = request.args.get("url")
        raw_platform = request.args.get("platform")

    if raw_url is None:
        return _json_error("URL parameter is missing.", 400, "missing_url")

    try:
        url = validate_public_url(raw_url)
        requested_platform = _validate_platform(raw_platform)
    except (SecurityValidationError, ValueError) as exc:
        logger.warning(
            "request_id=%s correlation_id=%s event=input_rejected url=%s platform=%s error=%s",
            g.get("request_id", "-"),
            g.get("correlation_id", "-"),
            raw_url,
            raw_platform,
            exc,
        )
        return _json_error(str(exc), 400, "invalid_input")

    detected_platform = detect_platform(url)
    if requested_platform and requested_platform != detected_platform:
        return _json_error(
            "Platform does not match the submitted URL.",
            400,
            "platform_mismatch",
        )

    cached_data, cache_type = get_cache(url)
    if cached_data is not None:
        metrics.record_cache_hit(
            cache_type,
            cached_data.get("metadata", {}).get("body_bytes_read", 0),
        )
        logger.info(
            "request_id=%s correlation_id=%s event=cache_hit type=%s platform=%s url=%s",
            g.get("request_id", "-"),
            g.get("correlation_id", "-"),
            cache_type,
            cached_data.get("platform", detected_platform),
            url,
        )
        return jsonify({"success": True, "cached": True, "result": cached_data})

    metrics.record_cache_miss()
    logger.info(
        "request_id=%s correlation_id=%s event=cache_miss platform=%s url=%s",
        g.get("request_id", "-"),
        g.get("correlation_id", "-"),
        detected_platform,
        url,
    )

    with request_locks.lock_for(url):
        cached_data, cache_type = get_cache(url)
        if cached_data is not None:
            metrics.record_cache_hit(
                cache_type,
                cached_data.get("metadata", {}).get("body_bytes_read", 0),
            )
            logger.info(
                "request_id=%s correlation_id=%s event=cache_hit_after_wait type=%s platform=%s url=%s",
                g.get("request_id", "-"),
                g.get("correlation_id", "-"),
                cache_type,
                cached_data.get("platform", detected_platform),
                url,
            )
            return jsonify({"success": True, "cached": True, "result": cached_data})

        try:
            result = extract_metadata(url)
            
            # --- FIX: Normalize response for frontend compatibility ---
            result = normalize_extraction_result(result, url, detected_platform)
            
        except SecurityValidationError as exc:
            logger.warning("request_id=%s event=security_rejected error=%s", g.request_id, exc)
            return _json_error(str(exc), 400, "invalid_url")
        except ValueError as exc:
            logger.warning("request_id=%s event=extract_failed error=%s", g.request_id, exc)
            return _json_error(str(exc), 400, "extract_failed")
        except UpstreamBlocked as exc:
            logger.warning("request_id=%s event=extract_blocked error=%s", g.request_id, exc)
            return _json_error(str(exc), 415, "blocked_content_type")
        except Exception as exc:
            logger.error(
                "request_id=%s event=extract_unexpected error=%s",
                g.request_id,
                exc,
                exc_info=True,
            )
            return _json_error("Internal server error.", 500, "internal_error")

        set_cache(url, result)
        return jsonify({"success": True, "cached": False, "result": result})

# --- FIX: New endpoint for platform-specific downloads ---
@app.route("/api/v1/<string:platform>/download", methods=["POST"])
@rate_limit
def platform_download(platform):
    """Handle platform-specific download requests"""
    metrics.record_api_request()
    
    # --- FIX: Map platform to correct name ---
    mapped_platform = PLATFORM_MAP.get(platform.lower(), platform.lower())
    if mapped_platform not in Config.SUPPORTED_PLATFORMS:
        return _json_error(f"Unsupported platform: {platform}", 400, "unsupported_platform")
    
    payload = request.get_json(silent=True) or {}
    url = payload.get("url")
    
    if not url:
        return _json_error("URL parameter is missing.", 400, "missing_url")
    
    try:
        validated_url = validate_public_url(url)
        detected_platform = detect_platform(validated_url)
        
        # --- FIX: Validate platform matches URL ---
        if detected_platform and detected_platform != mapped_platform:
            return _json_error(
                f"URL does not match platform. Detected: {detected_platform}, Requested: {mapped_platform}",
                400,
                "platform_mismatch"
            )
    except SecurityValidationError as exc:
        return _json_error(str(exc), 400, "invalid_url")
    
    # --- FIX: Extract metadata using the platform-specific endpoint ---
    try:
        result = extract_metadata(validated_url)
        result = normalize_extraction_result(result, validated_url, mapped_platform)
        
        return jsonify({
            "success": True,
            "platform": mapped_platform,
            "media_info": result.get("media_info", {}),
            "downloads": result.get("downloads", {}),
            "metadata": result.get("metadata", {}),
            "url": result.get("url", validated_url)
        })
        
    except Exception as exc:
        logger.error(f"Platform download error: {exc}", exc_info=True)
        return _json_error(str(exc), 500, "extract_failed")

# --- FIX: Normalization helper function ---
def normalize_extraction_result(result, url, platform):
    """Normalize extraction result for consistent frontend consumption"""
    
    if not isinstance(result, dict):
        result = {"raw": result}
    
    # Ensure platform is set
    if "platform" not in result:
        result["platform"] = platform
    
    # Ensure URL is present
    if "url" not in result:
        result["url"] = url
    
    # Create media_info if missing
    if "media_info" not in result:
        result["media_info"] = {}
    
    # Ensure media_info has required fields
    if "title" not in result["media_info"]:
        result["media_info"]["title"] = result.get("title", "DownloadDash Media")
    
    # Create downloads structure
    if "downloads" not in result:
        result["downloads"] = {}
    
    # --- FIX: Extract download URLs from various possible locations ---
    downloads = result["downloads"]
    
    # Extract from various common formats
    if "download_url" in result and not downloads.get("videoHD"):
        downloads["videoHD"] = result["download_url"]
    
    if "video" in result and not downloads.get("videoSD"):
        downloads["videoSD"] = result["video"]
    
    if "audio" in result and not downloads.get("audio"):
        downloads["audio"] = result["audio"]
    
    if "image" in result and not downloads.get("image"):
        downloads["image"] = result["image"]
    
    # Handle medias/streams arrays
    if "medias" in result and isinstance(result["medias"], list):
        for media in result["medias"]:
            if isinstance(media, dict):
                media_type = media.get("type", media.get("media_type", "video"))
                media_url = media.get("url", media.get("download_url"))
                if media_url:
                    if "video" in media_type.lower() and not downloads.get("videoHD"):
                        downloads["videoHD"] = media_url
                    elif "audio" in media_type.lower() and not downloads.get("audio"):
                        downloads["audio"] = media_url
                    elif "image" in media_type.lower() and not downloads.get("image"):
                        downloads["image"] = media_url
    
    if "streams" in result and isinstance(result["streams"], list):
        for stream in result["streams"]:
            if isinstance(stream, dict):
                stream_url = stream.get("url", stream.get("download_url"))
                quality = stream.get("quality", stream.get("label", "default"))
                if stream_url:
                    if "hd" in quality.lower() or "high" in quality.lower():
                        downloads["videoHD"] = stream_url
                    elif not downloads.get("videoSD"):
                        downloads["videoSD"] = stream_url
    
    # Handle links array
    if "links" in result and isinstance(result["links"], list):
        for link in result["links"]:
            if isinstance(link, str) and not downloads.get("fallback"):
                downloads["fallback"] = link
            elif isinstance(link, dict):
                link_url = link.get("url", link.get("download_url"))
                link_type = link.get("type", "video")
                if link_url:
                    if "video" in link_type.lower() and not downloads.get("videoHD"):
                        downloads["videoHD"] = link_url
                    elif "audio" in link_type.lower() and not downloads.get("audio"):
                        downloads["audio"] = link_url
                    elif "image" in link_type.lower() and not downloads.get("image"):
                        downloads["image"] = link_url
    
    # Set fallback if nothing else found
    if not downloads and "url" in result:
        downloads["fallback"] = result["url"]
    
    # Ensure proper thumbnail
    if "thumbnail" in result and not result["media_info"].get("thumbnail_url"):
        result["media_info"]["thumbnail_url"] = result["thumbnail"]
    
    if "thumbnail_url" in result and not result["media_info"].get("thumbnail_url"):
        result["media_info"]["thumbnail_url"] = result["thumbnail_url"]
    
    return result

def _prometheus_metrics(report):
    lines = [
        "# HELP downloaddash_api_requests_total Total API requests.",
        "# TYPE downloaddash_api_requests_total counter",
        f"downloaddash_api_requests_total {report['api_requests']}",
        "# HELP downloaddash_errors_total Total structured errors.",
        "# TYPE downloaddash_errors_total counter",
        f"downloaddash_errors_total {report['errors']}",
        "# HELP downloaddash_rate_limited_total Total rate-limited requests.",
        "# TYPE downloaddash_rate_limited_total counter",
        f"downloaddash_rate_limited_total {report['rate_limited']}",
        "# HELP downloaddash_upstream_requests_total Total upstream metadata requests.",
        "# TYPE downloaddash_upstream_requests_total counter",
        f"downloaddash_upstream_requests_total {report['upstream_requests']}",
        "# HELP downloaddash_upstream_failures_total Total upstream request failures.",
        "# TYPE downloaddash_upstream_failures_total counter",
        f"downloaddash_upstream_failures_total {report['upstream_failures']}",
        "# HELP downloaddash_upstream_bytes_total Total upstream body bytes read.",
        "# TYPE downloaddash_upstream_bytes_total counter",
        f"downloaddash_upstream_bytes_total {report['total_bytes']}",
        "# HELP downloaddash_cache_hit_ratio Cache hit ratio by layer.",
        "# TYPE downloaddash_cache_hit_ratio gauge",
        f"downloaddash_cache_hit_ratio{{layer=\"redis\"}} {report['redis_hit_rate']}",
        f"downloaddash_cache_hit_ratio{{layer=\"memory\"}} {report['memory_cache_hit_rate']}",
        "# HELP downloaddash_upstream_latency_ms Average upstream latency.",
        "# TYPE downloaddash_upstream_latency_ms gauge",
        f"downloaddash_upstream_latency_ms {report['average_latency_ms_per_upstream_request']}",
        "# HELP downloaddash_redis_latency_ms Average Redis latency.",
        "# TYPE downloaddash_redis_latency_ms gauge",
        f"downloaddash_redis_latency_ms {report['average_redis_latency_ms']}",
        "# HELP downloaddash_process_uptime_seconds Process uptime in seconds.",
        "# TYPE downloaddash_process_uptime_seconds gauge",
        f"downloaddash_process_uptime_seconds {report['uptime_seconds']}",
        "# HELP downloaddash_process_memory_bytes Python traced memory usage.",
        "# TYPE downloaddash_process_memory_bytes gauge",
        f"downloaddash_process_memory_bytes {report['process_memory_bytes']}",
        f"downloaddash_process_memory_peak_bytes {report['process_memory_peak_bytes']}",
        "# HELP downloaddash_bandwidth_saved_bytes Bytes estimated saved by cache hits.",
        "# TYPE downloaddash_bandwidth_saved_bytes counter",
        f"downloaddash_bandwidth_saved_bytes {report['proxy_bandwidth_saved_bytes_due_to_caching']}",
    ]
    for platform, data in report["platforms"].items():
        lines.append(
            f'downloaddash_upstream_requests_by_platform_total{{platform="{platform}"}} {data["upstream_requests"]}'
        )
        lines.append(
            f'downloaddash_upstream_bytes_by_platform_total{{platform="{platform}"}} {data["bytes"]}'
        )
    return "\n".join(lines) + "\n"

@app.route("/metrics", methods=["GET"])
@app.route("/api/v1/metrics", methods=["GET"])
def get_metrics():
    if not Config.METRICS_ENABLED:
        return _json_error("Metrics are disabled.", 404, "metrics_disabled")
    report = metrics.get_report()
    if "application/json" in request.headers.get("Accept", ""):
        return jsonify(report)
    return Response(_prometheus_metrics(report), mimetype="text/plain; version=0.0.4")

@app.errorhandler(404)
def not_found(exc):
    return _json_error("Not found.", 404, "not_found")

@app.errorhandler(405)
def method_not_allowed(exc):
    return _json_error("Method not allowed.", 405, "method_not_allowed")

@app.errorhandler(Exception)
def handle_exception(exc):
    logger.error(
        "request_id=%s event=unhandled_exception error=%s",
        g.get("request_id", "-"),
        exc,
        exc_info=True,
    )
    return _json_error("Internal server error.", 500, "internal_error")

if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
    )