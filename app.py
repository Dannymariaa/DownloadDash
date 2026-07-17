import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "expose_headers": "*"}})

# --- USE ENVIRONMENT VARIABLE FOR API KEY ---
EXPECTED_API_KEY = os.environ.get('DOWNLOADDASH_API_KEY', '').strip()

# --- Authentication with raw header access ---
@app.before_request
def check_auth():
    """Verify authentication for all protected endpoints"""
    # Public endpoints (including debug)
    public_endpoints = ['/', '/health', '/liveness', '/readiness', '/docs', '/openapi.json', '/metrics', '/debug-headers']
    
    if request.path in public_endpoints or request.path.startswith('/static/'):
        return
    
    if request.method == 'OPTIONS':
        return
    
    # --- FIX: Access headers from both request.headers and request.environ ---
    api_key = ''
    
    # Method 1: Try request.headers (normal way)
    api_key = request.headers.get('DOWNLOADDASH_API_KEY', '').strip()
    
    # Method 2: Try X-API-Key
    if not api_key:
        api_key = request.headers.get('X-API-Key', '').strip()
    
    # Method 3: Try X-DownloadDash-Key
    if not api_key:
        api_key = request.headers.get('X-DownloadDash-Key', '').strip()
    
    # Method 4: Try Authorization header
    if not api_key:
        auth_header = request.headers.get('Authorization', '').strip()
        if auth_header.startswith('Bearer '):
            api_key = auth_header[7:].strip()
    
    # Method 5: Try raw environ (bypasses any header filtering)
    if not api_key:
        # Check environ for HTTP_ prefixed headers
        for key, value in request.environ.items():
            if key.startswith('HTTP_'):
                # Convert HTTP_DOWNLOADDASH_API_KEY to DOWNLOADDASH_API_KEY
                header_name = key[5:].replace('_', '-').title()
                if header_name == 'Downloaddash-Api-Key':
                    api_key = value.strip()
                    break
    
    # Debug logging
    print("=" * 60)
    print("🔐 AUTHENTICATION DEBUG")
    print("=" * 60)
    print(f"📥 Received API Key: '{api_key}'")
    print(f"📥 Received Key Length: {len(api_key) if api_key else 0}")
    print(f"📤 Expected API Key: '{EXPECTED_API_KEY}'")
    print(f"📤 Expected Key Length: {len(EXPECTED_API_KEY)}")
    print(f"🔑 Keys Match: {api_key == EXPECTED_API_KEY}")
    
    # Print all headers from request.headers
    print("📋 Headers from request.headers:")
    for key, value in request.headers.items():
        print(f"   {key}: {value[:30] if len(str(value)) > 30 else value}")
    
    print("=" * 60)
    
    # --- EARLY RETURN - NO PROCESSING IF AUTH FAILS ---
    if not EXPECTED_API_KEY:
        print("⚠️ DOWNLOADDASH_API_KEY not configured - allowing all requests (DEVELOPMENT MODE)")
        return
    
    if not api_key:
        print("❌ Missing API key - returning 403 immediately")
        return jsonify({
            "success": False,
            "message": "Missing DOWNLOADDASH_API_KEY header",
            "error": "AUTH_FAILED"
        }), 403
    
    if api_key != EXPECTED_API_KEY:
        print("❌ Invalid API key - returning 403 immediately")
        return jsonify({
            "success": False,
            "message": "Invalid DOWNLOADDASH_API_KEY",
            "error": "AUTH_FAILED"
        }), 403
    
    print("✅ Authentication successful!")
    return

# --- CORS headers ---
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key, X-DownloadDash-Key, DOWNLOADDASH_API_KEY'
    response.headers['Access-Control-Expose-Headers'] = '*'
    return response

# --- Debug endpoint (now public) ---
@app.route("/debug-headers", methods=["GET", "POST"])
def debug_headers():
    """Debug endpoint to see all received headers"""
    return jsonify({
        "headers_from_request": dict(request.headers),
        "downloaddash_key": request.headers.get('DOWNLOADDASH_API_KEY'),
        "x_api_key": request.headers.get('X-API-Key'),
        "x_downloaddash_key": request.headers.get('X-DownloadDash-Key'),
        "authorization": request.headers.get('Authorization'),
        "method": request.method,
        "path": request.path,
        "all_headers": dict(request.headers)
    })

# --- Routes ---
@app.route("/", methods=["GET"])
def home():
    return jsonify({"success": True, "service": "DownloadDash API", "version": "1.0.0"})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"success": True, "status": "healthy"})

@app.route("/youtube/download", methods=["POST"])
def youtube_download():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"success": False, "error": "Missing JSON body"}), 400
        
        url = data.get('url')
        if not url:
            return jsonify({"success": False, "error": "URL is required"}), 400
        
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
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "instagram",
            "title": "Instagram Post Download",
            "downloads": {"image": "https://example.com/image.jpg", "video": "https://example.com/video.mp4"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/tiktok/download", methods=["POST"])
def tiktok_download():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "tiktok",
            "title": "TikTok Video Download",
            "downloads": {"video": "https://example.com/tiktok.mp4"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/facebook/download", methods=["POST"])
def facebook_download():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "facebook",
            "title": "Facebook Video Download",
            "downloads": {"video": "https://example.com/facebook.mp4"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/pinterest/download", methods=["POST"])
def pinterest_download():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "pinterest",
            "title": "Pinterest Image Download",
            "downloads": {"image": "https://example.com/pinterest.jpg"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/reddit/download", methods=["POST"])
def reddit_download():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "reddit",
            "title": "Reddit Post Download",
            "downloads": {"video": "https://example.com/reddit.mp4", "image": "https://example.com/reddit.jpg"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/twitter/download", methods=["POST"])
def twitter_download():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "x",
            "title": "X/Twitter Post Download",
            "downloads": {"video": "https://example.com/x.mp4", "image": "https://example.com/x.jpg"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/telegram/download", methods=["POST"])
def telegram_download():
    try:
        data = request.get_json(silent=True)
        if not data or not data.get('url'):
            return jsonify({"success": False, "error": "URL is required"}), 400
        return jsonify({
            "success": True,
            "platform": "telegram",
            "title": "Telegram Media Download",
            "downloads": {"video": "https://example.com/telegram.mp4", "file": "https://example.com/telegram.zip"}
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port, debug=True)