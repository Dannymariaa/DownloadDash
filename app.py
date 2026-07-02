import os
import time
import uuid

from flask import Flask, Response, g, jsonify, request

from cache import get_cache, redis_health, set_cache
from config import Config
from downloader import UpstreamBlocked, detect_platform, extract_metadata
from locks import request_locks
from metrics import metrics
from rate_limit import rate_limit
from security import SecurityValidationError, validate_public_url
from utils.logger import logger

app = Flask(__name__)


def _json_error(message, status=400, code="bad_request"):
    metrics.record_error()
    return jsonify({"success": False, "error": message, "code": code}), status


def _validate_platform(value):
    if value is None or value == "":
        return None
    platform = value.strip().lower()
    if platform not in Config.SUPPORTED_PLATFORMS:
        raise ValueError("Unsupported platform.")
    return platform


@app.before_request
def attach_request_context():
    request_id = request.headers.get("X-Request-ID", "").strip()
    g.request_id = request_id[:128] if request_id else str(uuid.uuid4())
    g.started_at = time.monotonic()


@app.after_request
def log_request(response):
    elapsed_ms = (time.monotonic() - g.get("started_at", time.monotonic())) * 1000
    response.headers["X-Request-ID"] = g.get("request_id", "-")
    logger.info(
        "request_id=%s event=http method=%s path=%s status=%s time_ms=%.2f remote_addr=%s",
        g.get("request_id", "-"),
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
def health():
    return jsonify({"success": True, "status": "healthy"})


@app.route("/liveness", methods=["GET"])
def liveness():
    return jsonify({"success": True, "status": "alive"})


@app.route("/readiness", methods=["GET"])
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


@app.route("/extract", methods=["GET"])
@rate_limit
def extract_media():
    metrics.record_api_request()
    raw_url = request.args.get("url")
    raw_platform = request.args.get("platform")

    if raw_url is None:
        return _json_error("URL parameter is missing.", 400, "missing_url")

    try:
        url = validate_public_url(raw_url)
        requested_platform = _validate_platform(raw_platform)
    except (SecurityValidationError, ValueError) as exc:
        logger.warning(
            "request_id=%s event=input_rejected url=%s platform=%s error=%s",
            g.get("request_id", "-"),
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
            "request_id=%s event=cache_hit type=%s platform=%s url=%s",
            g.get("request_id", "-"),
            cache_type,
            cached_data.get("platform", detected_platform),
            url,
        )
        return jsonify({"success": True, "cached": True, "result": cached_data})

    metrics.record_cache_miss()
    logger.info(
        "request_id=%s event=cache_miss platform=%s url=%s",
        g.get("request_id", "-"),
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
                "request_id=%s event=cache_hit_after_wait type=%s platform=%s url=%s",
                g.get("request_id", "-"),
                cache_type,
                cached_data.get("platform", detected_platform),
                url,
            )
            return jsonify({"success": True, "cached": True, "result": cached_data})

        try:
            result = extract_metadata(url)
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


def _prometheus_metrics(report):
    lines = [
        "# HELP downloaddash_api_requests_total Total API requests.",
        "# TYPE downloaddash_api_requests_total counter",
        f"downloaddash_api_requests_total {report['api_requests']}",
        "# HELP downloaddash_errors_total Total structured errors.",
        "# TYPE downloaddash_errors_total counter",
        f"downloaddash_errors_total {report['errors']}",
        "# HELP downloaddash_upstream_requests_total Total upstream metadata requests.",
        "# TYPE downloaddash_upstream_requests_total counter",
        f"downloaddash_upstream_requests_total {report['upstream_requests']}",
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
