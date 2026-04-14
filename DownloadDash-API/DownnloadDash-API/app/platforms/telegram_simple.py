from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException


class TelegramDownloader:
    """
    Minimal Telegram placeholder to keep the API runnable locally.

    For real Telegram downloads, wire this up to Telethon or the Bot API.
    """

    def __init__(self, bot_token: Optional[str] = None):
        self.bot_token = bot_token
        self.client = httpx.AsyncClient(timeout=30.0)

    async def connect(self):
        return True

    async def disconnect(self):
        await self.client.aclose()

    async def get_chats(self) -> List[Dict[str, Any]]:
        raise HTTPException(
            status_code=400,
            detail="Telegram is not configured. Set TELEGRAM_BOT_TOKEN to enable Telegram endpoints.",
        )

    async def download_channel_media(self, channel: str, limit: int = 10):
        raise HTTPException(
            status_code=400,
            detail="Telegram downloading is not configured yet.",
        )

