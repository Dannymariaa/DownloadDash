from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import time

from app.config import settings
from fastapi.middleware.cors import CORSMiddleware
from app.api.core import router as core_router
from app.api.download import router as download_router

# Import all platform-specific routers
from app.routers import (
    instagram_router,
    tiktok_router,
    facebook_router,
    pinterest_router,
    reddit_router,
    twitter_router,
    youtube_router,
    telegram_router,
    whatsapp_router,
    whatsapp_business_router
)

# Import state managers
from app.state import telegram_downloader, whatsapp_downloader, whatsapp_business_downloader

# Create FastAPI app
app = FastAPI(
    title="Social Media Downloader API",
    version="1.0.0",
    description="API for downloading content from various social media platforms",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Track request counts for rate limiting
request_counts = {}

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS if hasattr(settings, 'BACKEND_CORS_ORIGINS') else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware to prevent abuse"""
    # Rate limit only download endpoints
    if request.method == "POST" and (
        request.url.path == "/download" or 
        "/download" in request.url.path or
        request.url.path.endswith("/download")
    ):
        client_ip = request.client.host if request.client else "unknown"
        current_day = int(time.time() / 86400)
        key = f"{client_ip}:{current_day}"
        request_counts[key] = request_counts.get(key, 0) + 1

        # Check daily limit
        daily_limit = getattr(settings, 'DAILY_DOWNLOAD_LIMIT', 50)
        if request_counts[key] > daily_limit:
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": "Rate limit exceeded. Try again later.",
                    "limit": daily_limit,
                    "reset": "tomorrow"
                },
            )

    return await call_next(request)


# Include all routers
app.include_router(core_router, prefix="/api", tags=["core"])
app.include_router(download_router, prefix="/api", tags=["download"])
app.include_router(download_router, tags=["download"])

# Include platform-specific routers
app.include_router(instagram_router, tags=["instagram"])
app.include_router(tiktok_router, tags=["tiktok"])
app.include_router(facebook_router, tags=["facebook"])
app.include_router(pinterest_router, tags=["pinterest"])
app.include_router(reddit_router, tags=["reddit"])
app.include_router(twitter_router, tags=["twitter"])
app.include_router(youtube_router, tags=["youtube"])
app.include_router(telegram_router, tags=["telegram"])
app.include_router(whatsapp_router, tags=["whatsapp"])
app.include_router(whatsapp_business_router, tags=["whatsapp-business"])


@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    print("\n" + "="*60)
    print("🚀 SOCIAL MEDIA DOWNLOADER API STARTING...")
    print("="*60)
    
    # Initialize Telegram downloader
    try:
        await telegram_downloader.connect()
        print("✅ Telegram downloader initialized")
    except Exception as e:
        print(f"❌ Telegram downloader initialization failed: {e}")
    
    # WhatsApp bridges are HTTP-based; nothing to initialize here.
    print("Info: WhatsApp bridges will be checked on demand")
    
    print("\n📋 Available Endpoints:")
    print("   - POST /instagram/download")
    print("   - POST /tiktok/download")
    print("   - POST /facebook/download")
    print("   - POST /pinterest/download")
    print("   - POST /reddit/download")
    print("   - POST /twitter/download")
    print("   - POST /youtube/download")
    print("   - POST /telegram/download")
    print("   - GET /whatsapp/qr")
    print("   - GET /whatsapp/status")
    print("   - GET /whatsapp-business/qr")
    print("   - GET /whatsapp-business/status")
    print("\n📚 API Documentation: /docs")
    print("="*60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Run shutdown tasks"""
    print("\n" + "="*60)
    print("🛑 SOCIAL MEDIA DOWNLOADER API SHUTTING DOWN...")
    print("="*60)
    
    # Close WhatsApp downloader
    try:
        await whatsapp_downloader.close()
        print("✅ WhatsApp downloader closed")
    except Exception as e:
        print(f"❌ Error closing WhatsApp downloader: {e}")
    
    # Disconnect Telegram downloader
    try:
        await telegram_downloader.disconnect()
        print("✅ Telegram downloader disconnected")
    except Exception as e:
        print(f"❌ Error disconnecting Telegram downloader: {e}")
    
    print("="*60 + "\n")


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Social Media Downloader API",
        "version": "1.0.0",
        "description": "Download content from various social media platforms",
        "endpoints": {
            "instagram": "/instagram/download",
            "tiktok": "/tiktok/download",
            "facebook": "/facebook/download",
            "pinterest": "/pinterest/download",
            "reddit": "/reddit/download",
            "twitter": "/twitter/download",
            "youtube": "/youtube/download",
            "telegram": "/telegram/download",
            "whatsapp": "/whatsapp/qr",
            "whatsapp_business": "/whatsapp-business/qr"
        },
        "documentation": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    wa_status = await whatsapp_downloader.get_connection_status()
    wa_business_status = await whatsapp_business_downloader.get_connection_status()
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "telegram": telegram_downloader.is_connected if hasattr(telegram_downloader, "is_connected") else False,
            "whatsapp": bool(wa_status.get("connected")),
            "whatsapp_business": bool(wa_business_status.get("connected")),
        }
    }

@app.get("/stats")
async def get_stats():
    """Get API statistics"""
    total_requests = sum(request_counts.values())
    return {
        "total_download_requests": total_requests,
        "daily_counts": dict(request_counts),
        "active_platforms": [
            "instagram", "tiktok", "facebook", "pinterest", 
            "reddit", "twitter", "youtube", "telegram", 
            "whatsapp", "whatsapp_business"
        ]
    }

