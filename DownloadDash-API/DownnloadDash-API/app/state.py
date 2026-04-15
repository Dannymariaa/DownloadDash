from pathlib import Path

from .config import settings
from .platforms.public_platforms import PublicPlatformDownloader
from .platforms.universal_downloader import UniversalMediaDownloader
from .platforms.whatsapp_http import WhatsAppDownloader
from .platforms.telegram_simple import TelegramDownloader


def _resolve_cookiefile() -> str | None:
    if settings.YTDLP_COOKIEFILE:
        return settings.YTDLP_COOKIEFILE

    if not settings.YTDLP_COOKIE_DATA:
        return None

    cookie_text = settings.YTDLP_COOKIE_DATA.replace("\\n", "\n").strip()
    if not cookie_text:
        return None

    cookie_path = Path(settings.TEMP_PATH) / "yt-dlp-cookies.txt"
    cookie_path.write_text(cookie_text + "\n", encoding="utf-8")
    return str(cookie_path)


public_downloader = PublicPlatformDownloader(
    download_path=settings.DOWNLOAD_PATH,
    cookiefile=_resolve_cookiefile(),
)
universal_downloader = UniversalMediaDownloader(public_downloader=public_downloader)
whatsapp_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BRIDGE_URL)
whatsapp_business_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BUSINESS_BRIDGE_URL)
telegram_downloader = TelegramDownloader(bot_token=settings.TELEGRAM_BOT_TOKEN)
