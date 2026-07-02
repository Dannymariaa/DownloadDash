import os

from flask import Flask, jsonify, request

from cache import get_cache, set_cache
from downloader import UpstreamBlocked, extract_metadata
from locks import request_locks
from metrics import metrics
from rate_limit import rate_limit
from utils.logger import logger

app = Flask(__name__)


def _error(message, status=400):
    return jsonify({"success": False, "error": message}), status


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


@app.route("/extract", methods=["GET"])
@rate_limit
def extract_media():
    metrics.record_api_request()
    url = (request.args.get("url") or "").strip()
    if not url:
        return _error("URL parameter is missing.", 400)

    cached_data, cache_type = get_cache(url)
    if cached_data is not None:
        metrics.record_cache_hit(
            cache_type,
            cached_data.get("metadata", {}).get("body_bytes_read", 0),
        )
        logger.info("cache_hit type=%s url=%s", cache_type, url)
        return jsonify({"success": True, "cached": True, "result": cached_data})

    metrics.record_cache_miss()
    logger.info("cache_miss url=%s", url)

    with request_locks.lock_for(url):
        cached_data, cache_type = get_cache(url)
        if cached_data is not None:
            metrics.record_cache_hit(
                cache_type,
                cached_data.get("metadata", {}).get("body_bytes_read", 0),
            )
            logger.info("cache_hit_after_wait type=%s url=%s", cache_type, url)
            return jsonify({"success": True, "cached": True, "result": cached_data})

        try:
            result = extract_metadata(url)
        except ValueError as exc:
            logger.warning("extract_failed url=%s error=%s", url, exc)
            return _error(str(exc), 400)
        except UpstreamBlocked as exc:
            logger.warning("extract_blocked url=%s error=%s", url, exc)
            return _error(str(exc), 415)
        except Exception as exc:
            logger.error("extract_unexpected url=%s error=%s", url, exc, exc_info=True)
            return _error("Internal server error.", 500)

        set_cache(url, result)
        return jsonify({"success": True, "cached": False, "result": result})


@app.route("/metrics", methods=["GET"])
def get_metrics():
    return jsonify(metrics.get_report())


@app.errorhandler(Exception)
def handle_exception(exc):
    logger.error("unhandled_exception error=%s", exc, exc_info=True)
    return _error("Internal server error.", 500)


if __name__ == "__main__":
    app.run(
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
    )
