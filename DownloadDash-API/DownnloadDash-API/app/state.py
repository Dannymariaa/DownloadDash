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
    "facebook": _resolve_cookiefile(
        "facebook",
        None,
        settings.YTDLP_COOKIE_DATA_FACEBOOK,
        "yt-dlp-facebook-cookies.txt",
    ),
    "instagram": _resolve_cookiefile(
        "instagram",
        settings.YTDLP_COOKIEFILE_INSTAGRAM,
        settings.YTDLP_COOKIE_DATA_INSTAGRAM,
        "yt-dlp-instagram-cookies.txt",
    ),
    "reddit": _resolve_cookiefile(
        "reddit",
        None,
        settings.YTDLP_COOKIE_DATA_REDDIT,
        "yt-dlp-reddit-cookies.txt",
    ),
    "tiktok": _resolve_cookiefile(
        "tiktok",
        settings.YTDLP_COOKIEFILE_TIKTOK,
        settings.YTDLP_COOKIE_DATA_TIKTOK,
        "yt-dlp-tiktok-cookies.txt",
    ),
    "x": _resolve_cookiefile(
        "x/twitter",
        None,
        settings.YTDLP_COOKIE_DATA_X,
        "yt-dlp-x-cookies.txt",
    ),
}

outbound_proxy = settings.OUTBOUND_PROXY or settings.YTDLP_PROXY
youtube_proxy = settings.YTDLP_PROXY_YOUTUBE or outbound_proxy
yt_dlp_proxy_urls = {
    "default": outbound_proxy,
    "facebook": settings.YTDLP_PROXY_FACEBOOK or settings.YTDLP_PROXY_FACEBOOOK or outbound_proxy,
    "instagram": settings.YTDLP_PROXY_INSTAGRAM or outbound_proxy,
    "reddit": settings.YTDLP_PROXY_REDDIT or outbound_proxy,
    "tiktok": settings.YTDLP_PROXY_TIKTOK or outbound_proxy,
    "x": settings.YTDLP_PROXY_X or outbound_proxy,
    "twitter": settings.YTDLP_PROXY_X or outbound_proxy,
    "youtube": youtube_proxy,
}

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
    proxy_urls=yt_dlp_proxy_urls,
    youtube_proxy_url=youtube_proxy,
)
universal_downloader = UniversalMediaDownloader(public_downloader=public_downloader)
gallery_cookiefiles = {
    "default": _resolve_cookiefile(
        "gallery-dl default",
        settings.GALLERY_DL_COOKIEFILE,
        settings.GALLERY_DL_COOKIE_DATA,
        "gallery-dl-cookies.txt",
    ),
    "facebook": _resolve_cookiefile(
        "gallery-dl facebook",
        None,
        settings.GALLERY_DL_COOKIE_DATA_FACEBOOK,
        "gallery-dl-facebook-cookies.txt",
    ),
    "instagram": _resolve_cookiefile(
        "gallery-dl instagram",
        None,
        settings.GALLERY_DL_COOKIE_DATA_INSTAGRAM,
        "gallery-dl-instagram-cookies.txt",
    ),
    "pinterest": _resolve_cookiefile(
        "gallery-dl pinterest",
        None,
        settings.GALLERY_DL_COOKIE_DATA_PINTEREST,
        "gallery-dl-pinterest-cookies.txt",
    ),
    "reddit": _resolve_cookiefile(
        "gallery-dl reddit",
        None,
        settings.GALLERY_DL_COOKIE_DATA_REDDIT,
        "gallery-dl-reddit-cookies.txt",
    ),
    "tiktok": _resolve_cookiefile(
        "gallery-dl tiktok",
        None,
        settings.GALLERY_DL_COOKIE_DATA_TIKTOK,
        "gallery-dl-tiktok-cookies.txt",
    ),
    "x": _resolve_cookiefile(
        "gallery-dl x/twitter",
        None,
        settings.GALLERY_DL_COOKIE_X,
        "gallery-dl-x-cookies.txt",
    ),
}
gallery_proxy = settings.GALLERY_DL_PROXY or settings.OUTBOUND_PROXY
gallery_proxy_urls = {
    "default": gallery_proxy,
    "facebook": settings.GALLERY_DL_PROXY_FACEBOOK or settings.GALLERY_DL_PROXY_FACEBOOOK or gallery_proxy,
    "instagram": settings.GALLERY_DL_PROXY_INSTAGRAM or gallery_proxy,
    "pinterest": settings.GALLERY_DL_PROXY_PINTEREST or gallery_proxy,
    "reddit": settings.GALLERY_DL_PROXY_REDDIT or gallery_proxy,
    "tiktok": settings.GALLERY_DL_PROXY_TIKTOK or gallery_proxy,
    "x": settings.GALLERY_DL_PROXY_X or gallery_proxy,
    "twitter": settings.GALLERY_DL_PROXY_X or gallery_proxy,
}
gallery_downloader = GalleryDLDownloader(
    download_path=settings.DOWNLOAD_PATH,
    cookiefile=settings.GALLERY_DL_COOKIEFILE,
    cookie_data=settings.GALLERY_DL_COOKIE_DATA,
    cookiefiles=gallery_cookiefiles,
    proxy_url=gallery_proxy,
    proxy_urls=gallery_proxy_urls,
    timeout_seconds=settings.GALLERY_DL_TIMEOUT_SECONDS,
)
whatsapp_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BRIDGE_URL)
whatsapp_business_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BUSINESS_BRIDGE_URL)
telegram_downloader = TelegramDownloader(bot_token=settings.TELEGRAM_BOT_TOKEN)
