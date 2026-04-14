from .config import settings
from .platforms.public_platforms import PublicPlatformDownloader
from .platforms.universal_downloader import UniversalMediaDownloader
from .platforms.whatsapp_http import WhatsAppDownloader
from .platforms.telegram_simple import TelegramDownloader


public_downloader = PublicPlatformDownloader(
    download_path=settings.DOWNLOAD_PATH,
    cookiefile=settings.YTDLP_COOKIEFILE,
)
universal_downloader = UniversalMediaDownloader(public_downloader=public_downloader)
whatsapp_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BRIDGE_URL)
whatsapp_business_downloader = WhatsAppDownloader(bridge_url=settings.WHATSAPP_BUSINESS_BRIDGE_URL)
telegram_downloader = TelegramDownloader(bot_token=settings.TELEGRAM_BOT_TOKEN)
