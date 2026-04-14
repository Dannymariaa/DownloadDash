from .instagram import router as instagram_router
from .tiktok import router as tiktok_router
from .facebook import router as facebook_router
from .pinterest import router as pinterest_router
from .reddit import router as reddit_router
from .twitter import router as twitter_router
from .youtube import router as youtube_router
from .telegram import router as telegram_router
from .whatsapp import router as whatsapp_router
from .whatsapp_business import router as whatsapp_business_router

__all__ = [
    'instagram_router',
    'tiktok_router',
    'facebook_router',
    'pinterest_router',
    'reddit_router',
    'twitter_router',
    'youtube_router',
    'telegram_router',
    'whatsapp_router',
    'whatsapp_business_router',
]