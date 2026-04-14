from fastapi import APIRouter, Request

from app.models.schemas import Platform, PlatformStatus
from app.state import public_downloader, whatsapp_downloader, whatsapp_business_downloader
from app.config import settings

router = APIRouter(tags=["core"])


@router.get("/health")
async def health():
    return {"ok": True}


@router.get("/")
async def root(request: Request):
    return {
        "message": "Social Media Downloader API",
        "docs": "/docs",
        "status": "/status",
        "public_platforms": [p.value for p in public_downloader.get_supported_platforms()],
        "messaging_platforms": [
            Platform.WHATSAPP.value,
            Platform.WHATSAPP_BUSINESS.value,
            Platform.TELEGRAM.value,
        ],
    }


@router.get("/platforms")
async def list_platforms():
    return {
        "public_platforms": [p.value for p in public_downloader.get_supported_platforms()],
        "messaging_platforms": [Platform.WHATSAPP.value, Platform.WHATSAPP_BUSINESS.value, Platform.TELEGRAM.value],
    }


@router.get("/platforms/{platform}/status", response_model=PlatformStatus)
async def platform_status(platform: Platform):
    if platform in public_downloader.get_supported_platforms():
        return PlatformStatus(
            platform=platform,
            is_available=True,
            requires_auth=False,
            is_authenticated=True,
        )

    if platform == Platform.WHATSAPP:
        status = await whatsapp_downloader.get_connection_status()
        return PlatformStatus(
            platform=platform,
            is_available=True,
            requires_auth=True,
            is_authenticated=bool(status.get("connected")),
            error=status.get("error"),
        )
    if platform == Platform.WHATSAPP_BUSINESS:
        status = await whatsapp_business_downloader.get_connection_status()
        return PlatformStatus(
            platform=platform,
            is_available=True,
            requires_auth=True,
            is_authenticated=bool(status.get("connected")),
            error=status.get("error"),
        )

    if platform == Platform.TELEGRAM:
        return PlatformStatus(
            platform=platform,
            is_available=False,
            requires_auth=True,
            is_authenticated=False,
            error="Telegram not configured",
        )

    return PlatformStatus(
        platform=platform,
        is_available=False,
        requires_auth=False,
        is_authenticated=False,
        error="Unknown platform",
    )


@router.get("/status")
async def all_status():
    """
    Convenience endpoint: returns statuses for the common platforms.
    """
    public_platforms = [
        Platform.INSTAGRAM,
        Platform.TIKTOK,
        Platform.FACEBOOK,
        Platform.REDDIT,
        Platform.PINTEREST,
        Platform.TWITTER,
        Platform.X,
        Platform.YOUTUBE,
    ]

    whatsapp_platforms = [Platform.WHATSAPP, Platform.WHATSAPP_BUSINESS]
    telegram_platforms = [Platform.TELEGRAM]

    statuses: dict[str, PlatformStatus] = {}

    for p in public_platforms:
        statuses[p.value] = PlatformStatus(
            platform=p,
            is_available=True,
            requires_auth=False,
            is_authenticated=True,
        )

    wa_status = await whatsapp_downloader.get_connection_status()
    wa_business_status = await whatsapp_business_downloader.get_connection_status()
    for p in whatsapp_platforms:
        status = wa_status if p == Platform.WHATSAPP else wa_business_status
        statuses[p.value] = PlatformStatus(
            platform=p,
            is_available=True,
            requires_auth=True,
            is_authenticated=bool(status.get("connected")),
            error=status.get("error"),
        )

    for p in telegram_platforms:
        statuses[p.value] = PlatformStatus(
            platform=p,
            is_available=bool(settings.TELEGRAM_BOT_TOKEN),
            requires_auth=True,
            is_authenticated=bool(settings.TELEGRAM_BOT_TOKEN),
            error=None if settings.TELEGRAM_BOT_TOKEN else "Telegram not configured",
        )

    return statuses
