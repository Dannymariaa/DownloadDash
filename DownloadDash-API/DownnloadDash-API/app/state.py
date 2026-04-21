from pathlib import Path

from .config import settings
from .platforms.public_platforms import PublicPlatformDownloader
from .platforms.universal_downloader import UniversalMediaDownloader
from .platforms.whatsapp_http import WhatsAppDownloader
from .platforms.telegram_simple import TelegramDownloader


def _count_cookie_rows(cookie_text: str) -> int:
    count = 0
    for line in cookie_text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if len(stripped.split("\t")) >= 7:
            count += 1
    return count


def _resolve_cookiefile() -> str | None:
    if settings.YTDLP_COOKIEFILE:
        print(f"Info: yt-dlp cookie file configured from path: {settings.YTDLP_COOKIEFILE}")
        return settings.YTDLP_COOKIEFILE

    if not settings.YTDLP_COOKIE_DATA:
        print("Info: yt-dlp cookies not configured")
        return None

    cookie_text = settings.YTDLP_COOKIE_DATA.replace("\\n", "\n").strip()
    if not cookie_text:
        print("Warning: SMD_YTDLP_COOKIE_DATA is set but empty after parsing")
        return None

    cookie_path = Path(settings.TEMP_PATH) / "yt-dlp-cookies.txt"
    cookie_path.write_text(cookie_text + "\n", encoding="utf-8")
    print(
        f"Info: yt-dlp cookies loaded from environment into {cookie_path} "
        f"with {_count_cookie_rows(cookie_text)} valid rows"
    )
    return str(cookie_path)


public_downloader = PublicPlatformDownloader(
    download_path=settings.DOWNLOAD_PATH,
    cookiefile=_resolve_cookiefile(),
    proxy_url=settings.YTDLP_PROXY,
)
universal_downloader = UniversalMediaDownloader(public_downloader=public_downloader)
whatsapp_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BRIDGE_URL)
whatsapp_business_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BUSINESS_BRIDGE_URL)
telegram_downloader = TelegramDownloader(bot_token=settings.TELEGRAM_BOT_TOKEN)
