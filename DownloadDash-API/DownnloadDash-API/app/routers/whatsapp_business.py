from fastapi import APIRouter

from ..state import whatsapp_business_downloader

router = APIRouter(prefix="/whatsapp-business", tags=["whatsapp-business"])


@router.get("/qr")
async def qr():
    qr_value = await whatsapp_business_downloader.get_qr_code()
    return {
        "qr": qr_value,
        "message": "Scan with WhatsApp Business" if qr_value else "Already connected or no QR available",
    }


@router.get("/status")
async def status():
    return await whatsapp_business_downloader.get_connection_status()
