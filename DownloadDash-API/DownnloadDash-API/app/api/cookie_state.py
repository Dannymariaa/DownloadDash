import time
from pathlib import Path
from typing import Any


def inspect_netscape_cookiefile(cookiefile: str | None) -> dict[str, Any]:
    """Inspect a Netscape cookie file without exposing cookie names or values."""
    state: dict[str, Any] = {
        "generated": False,
        "readable": False,
        "loaded": False,
        "cookieCount": 0,
        "expired": "NOT VERIFIED",
    }
    if not cookiefile:
        return state

    path = Path(cookiefile)
    state["generated"] = path.exists()
    if not path.exists():
        return state

    now = int(time.time())
    total = 0
    finite_expiries = 0
    future_expiries = 0
    expired_expiries = 0

    try:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                stripped = line.strip()
                if not stripped:
                    continue
                if stripped.startswith("#HttpOnly_"):
                    stripped = stripped.replace("#HttpOnly_", "", 1)
                elif stripped.startswith("#"):
                    continue

                parts = stripped.split("\t")
                if len(parts) < 7:
                    continue

                total += 1
                try:
                    expires_at = int(parts[4])
                except ValueError:
                    continue
                if expires_at <= 0:
                    continue

                finite_expiries += 1
                if expires_at <= now:
                    expired_expiries += 1
                else:
                    future_expiries += 1
    except Exception:
        return state

    state["readable"] = True
    state["cookieCount"] = total
    state["loaded"] = total > 0
    if finite_expiries and future_expiries:
        state["expired"] = "NO"
    elif finite_expiries and expired_expiries == finite_expiries:
        state["expired"] = "YES"
    elif finite_expiries:
        state["expired"] = "NO"

    return state
