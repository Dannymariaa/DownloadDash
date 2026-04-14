from fastapi import APIRouter

from ..state import whatsapp_downloader

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.get("/qr")
async def qr():
    qr_value = await whatsapp_downloader.get_qr_code()
    return {
        "qr": qr_value,
        "message": "Scan with WhatsApp" if qr_value else "Already connected or no QR available",
    }


@router.get("/status")
async def status():
    return await whatsapp_downloader.get_connection_status()
