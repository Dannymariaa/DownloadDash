import os
import time
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_api.downloader import download_media
from flask_api.utils.logger import logger

load_dotenv()

app = Flask(__name__)
request_counts = {}
DAILY_DOWNLOAD_LIMIT = int(os.getenv("DAILY_DOWNLOAD_LIMIT", 100))


def get_client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


@app.before_request
def rate_limit_middleware():
    if request.path != "/download" or request.method != "GET":
        return None

    client_ip = get_client_ip()
    current_day = int(time.time() / 86400)
    key = f"{client_ip}:{current_day}"
    request_counts[key] = request_counts.get(key, 0) + 1

    if request_counts[key] > DAILY_DOWNLOAD_LIMIT:
        return jsonify(
            success=False,
            error="Rate limit exceeded. Try again later.",
            limit=DAILY_DOWNLOAD_LIMIT,
            reset="tomorrow",
        ), 429

    return None


@app.route("/download", methods=["GET"])
def download():
    url = (request.args.get("url") or "").strip()
    platform = (request.args.get("platform") or "").strip().lower()

    if not url or not platform:
        return (
            jsonify(success=False, error="Missing required query parameters: url and platform."),
            400,
        )

    try:
        response = download_media(url, platform)
        return jsonify(response)
    except ValueError as exc:
        logger.warning("Download request failed: %s", str(exc))
        return jsonify(success=False, error=str(exc)), 400
    except Exception as exc:
        logger.error("Unexpected download error: %s", exc_info=exc)
        return jsonify(success=False, error="Internal server error."), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify(success=True, status="healthy")


@app.errorhandler(Exception)
def handle_exception(exc):
    logger.error("Unhandled exception: %s", exc, exc_info=exc)
    return jsonify(success=False, error="Internal server error."), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=False)
