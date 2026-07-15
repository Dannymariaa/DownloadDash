import os
import time
import uuid
import re
from functools import wraps

from flask import Flask, Response, g, jsonify, request
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# --- Platform mapping ---
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

# --- Authentication helper ---
def authenticate_request():
    """Check if the request has a valid DOWNLOADDASH_API_KEY"""
    api_key = request.headers.get('DOWNLOADDASH_API_KEY', '').strip()
    
    # Try Authorization header as fallback
    if not api_key:
        auth_header = request.headers.get('Authorization', '').strip()
        if auth_header.startswith('Bearer '):
            api_key = auth_header[7:].strip()
    
    expected_key = os.environ.get('DOWNLOADDASH_API_KEY', '').strip()
    
    # DEVELOPMENT MODE: If no API key is configured, allow all
    if not expected_key:
        print("⚠️ DOWNLOADDASH_API_KEY not configured - allowing all requests (DEVELOPMENT MODE)")
        return True
    
    if not api_key:
        print("❌ Missing DOWNLOADDASH_API_KEY header")
        return False
    
    if api_key != expected_key:
        print(f"❌ Invalid API key: {api_key[:15]}... != {expected_key[:15]}...")
        return False
    
    print("✅ Authentication successful")
    return True

# --- Authentication middleware ---
@app.before_request
def check_auth():
    """Verify authentication for all protected endpoints"""
    public_endpoints = [
        '/', '/health', '/liveness', '/readiness', 
        '/docs', '/openapi.json', '/metrics'
    ]
    
    if request.path in public_endpoints or request.path.startswith('/static/'):
        return
    
    if request.method == 'OPTIONS':
        return
    
    if not authenticate_request():
        return jsonify({
            "success": False,
            "message": "Invalid or missing DOWNLOADDASH_API_KEY",
            "error": "AUTH_FAILED"
        }), 403

# --- CORS headers ---
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, DOWNLOADDASH_API_KEY'
    return response

# --- Routes ---
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "service": "DownloadDash API",
        "version": "1.0.0"
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"success": True, "status": "healthy"})

@app.route("/liveness", methods=["GET"])
def liveness():
    return jsonify({"success": True, "status": "alive"})

@app.route("/youtube/download", methods=["POST"])
def youtube_download():
    """YouTube download endpoint"""
    try:
        data = request.get_json()
        url = data.get('url') if data else None
        
        if not url:
            return jsonify({"success": False, "error": "URL is required"}), 400
        
        # Return mock response for testing
        return jsonify({
            "success": True,
            "platform": "youtube",
            "title": "YouTube Video Download",
            "downloads": {
                "videoHD": "https://example.com/video_hd.mp4",
                "videoSD": "https://example.com/video_sd.mp4",
                "audio": "https://example.com/audio.mp3"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/instagram/download", methods=["POST"])
def instagram_download():
    """Instagram download endpoint"""
    return jsonify({
        "success": True,
        "platform": "instagram",
        "title": "Instagram Post Download",
        "downloads": {
            "image": "https://example.com/image.jpg",
            "video": "https://example.com/video.mp4"
        }
    })

@app.route("/tiktok/download", methods=["POST"])
def tiktok_download():
    """TikTok download endpoint"""
    return jsonify({
        "success": True,
        "platform": "tiktok",
        "title": "TikTok Video Download",
        "downloads": {
            "video": "https://example.com/tiktok.mp4"
        }
    })

@app.route("/facebook/download", methods=["POST"])
def facebook_download():
    """Facebook download endpoint"""
    return jsonify({
        "success": True,
        "platform": "facebook",
        "title": "Facebook Video Download",
        "downloads": {
            "video": "https://example.com/facebook.mp4"
        }
    })

@app.route("/pinterest/download", methods=["POST"])
def pinterest_download():
    """Pinterest download endpoint"""
    return jsonify({
        "success": True,
        "platform": "pinterest",
        "title": "Pinterest Image Download",
        "downloads": {
            "image": "https://example.com/pinterest.jpg"
        }
    })

@app.route("/reddit/download", methods=["POST"])
def reddit_download():
    """Reddit download endpoint"""
    return jsonify({
        "success": True,
        "platform": "reddit",
        "title": "Reddit Post Download",
        "downloads": {
            "video": "https://example.com/reddit.mp4",
            "image": "https://example.com/reddit.jpg"
        }
    })

@app.route("/twitter/download", methods=["POST"])
def twitter_download():
    """Twitter/X download endpoint"""
    return jsonify({
        "success": True,
        "platform": "x",
        "title": "X/Twitter Post Download",
        "downloads": {
            "video": "https://example.com/x.mp4",
            "image": "https://example.com/x.jpg"
        }
    })

@app.route("/telegram/download", methods=["POST"])
def telegram_download():
    """Telegram download endpoint"""
    return jsonify({
        "success": True,
        "platform": "telegram",
        "title": "Telegram Media Download",
        "downloads": {
            "video": "https://example.com/telegram.mp4",
            "file": "https://example.com/telegram.zip"
        }
    })

@app.route("/docs", methods=["GET"])
def docs():
    return jsonify({
        "name": "DownloadDash API",
        "version": "1.0.0",
        "endpoints": {
            "youtube": "/youtube/download",
            "instagram": "/instagram/download",
            "tiktok": "/tiktok/download",
            "facebook": "/facebook/download",
            "pinterest": "/pinterest/download",
            "reddit": "/reddit/download",
            "twitter": "/twitter/download",
            "telegram": "/telegram/download"
        }
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
        host="0.0.0.0",
        port=port
    )