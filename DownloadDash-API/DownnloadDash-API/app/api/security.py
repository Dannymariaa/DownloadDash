from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader

from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(api_key: str | None = Depends(api_key_header)) -> None:
    """
    Optional API key enforcement.

    Enable by setting:
      - SMD_REQUIRE_API_KEY=true
      - SMD_API_KEY=your_key
    """
    if not settings.REQUIRE_API_KEY:
        return

    if not settings.API_KEY:
        raise HTTPException(status_code=500, detail="API key required but not configured")

    if api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

