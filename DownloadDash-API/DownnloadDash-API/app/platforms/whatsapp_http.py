import httpx
from typing import Optional, Dict, Any


class WhatsAppDownloader:
    """HTTP client for the Node.js WhatsApp bridge (whatsapp-bridge/index.js)."""

    def __init__(self, bridge_url: str = "http://127.0.0.1:3001"):
        self.bridge_url = bridge_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_qr_code(self) -> Optional[str]:
        try:
            response = await self.client.get(f"{self.bridge_url}/qr")
            response.raise_for_status()
            data = response.json()
            return data.get("qr")
        except Exception:
            return None

    async def get_connection_status(self) -> Dict[str, Any]:
        try:
            response = await self.client.get(f"{self.bridge_url}/status")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def download_status(self, status_id: str) -> bool:
        try:
            response = await self.client.post(
                f"{self.bridge_url}/download-status",
                json={"statusId": status_id},
            )
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        await self.client.aclose()

