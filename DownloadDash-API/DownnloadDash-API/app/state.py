from pathlib import Path

from .config import settings
from .platforms.public_platforms import PublicPlatformDownloader
from .platforms.universal_downloader import UniversalMediaDownloader
from .platforms.gallery_dl_downloader import GalleryDLDownloader
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


def _resolve_cookiefile(
    label: str,
    cookiefile: str | None,
    cookie_data: str | None,
    filename: str,
) -> str | None:
    if cookiefile:
        print(f"Info: yt-dlp {label} cookie file configured from path: {cookiefile}")
        return cookiefile

    if not cookie_data:
        print(f"Info: yt-dlp {label} cookies not configured")
        return None

    print(f"Info: yt-dlp {label} cookie env length: {len(cookie_data)}")
    cookie_text = cookie_data.replace("\\n", "\n").strip()
    if not cookie_text:
        print(f"Warning: yt-dlp {label} cookie data is set but empty after parsing")
        return None

    cookie_path = Path(settings.TEMP_PATH) / filename
    cookie_path.write_text(cookie_text + "\n", encoding="utf-8")
    print(
        f"Info: yt-dlp {label} cookies loaded from environment into {cookie_path} "
        f"with {_count_cookie_rows(cookie_text)} valid rows and parsed length {len(cookie_text)}"
    )
    return str(cookie_path)


default_cookiefile = _resolve_cookiefile(
    "default/youtube",
    settings.YTDLP_COOKIEFILE,
    settings.YTDLP_COOKIE_DATA,
    "yt-dlp-cookies.txt",
)

cookiefiles = {
    "default": default_cookiefile,
    "youtube": default_cookiefile,
    "instagram": _resolve_cookiefile(
        "instagram",
        settings.YTDLP_COOKIEFILE_INSTAGRAM,
        settings.YTDLP_COOKIE_DATA_INSTAGRAM,
        "yt-dlp-instagram-cookies.txt",
    ),
    "tiktok": _resolve_cookiefile(
        "tiktok",
        settings.YTDLP_COOKIEFILE_TIKTOK,
        settings.YTDLP_COOKIE_DATA_TIKTOK,
        "yt-dlp-tiktok-cookies.txt",
    ),
}

outbound_proxy = settings.OUTBOUND_PROXY or settings.YTDLP_PROXY
youtube_proxy = settings.YTDLP_PROXY_YOUTUBE or outbound_proxy

if youtube_proxy:
    if settings.YTDLP_PROXY_YOUTUBE:
        proxy_source = "SMD_YTDLP_PROXY_YOUTUBE"
    elif settings.OUTBOUND_PROXY:
        proxy_source = "SMD_OUTBOUND_PROXY"
    else:
        proxy_source = "SMD_YTDLP_PROXY"
    print(f"Info: yt-dlp YouTube proxy fallback configured from {proxy_source}")
else:
    print("Info: yt-dlp YouTube proxy fallback not configured")

public_downloader = PublicPlatformDownloader(
    download_path=settings.DOWNLOAD_PATH,
    cookiefile=cookiefiles.get("default"),
    cookiefiles=cookiefiles,
    proxy_url=outbound_proxy,
    youtube_proxy_url=youtube_proxy,
)
universal_downloader = UniversalMediaDownloader(public_downloader=public_downloader)
gallery_downloader = GalleryDLDownloader(
    download_path=settings.DOWNLOAD_PATH,
    cookiefile=settings.GALLERY_DL_COOKIEFILE,
    cookie_data=settings.GALLERY_DL_COOKIE_DATA,
    proxy_url=outbound_proxy,
    timeout_seconds=settings.GALLERY_DL_TIMEOUT_SECONDS,
)
whatsapp_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BRIDGE_URL)
whatsapp_business_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BUSINESS_BRIDGE_URL)
telegram_downloader = TelegramDownloader(bot_token=settings.TELEGRAM_BOT_TOKEN)
