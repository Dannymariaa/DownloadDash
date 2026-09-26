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
        "expiredCookieCount": 0,
        "nonExpiredCookieCount": 0,
        "sessionCookieCount": 0,
        "earliestExpiry": None,
        "latestExpiry": None,
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
    session_expiries = 0
    earliest_expiry: int | None = None
    latest_expiry: int | None = None

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
                    session_expiries += 1
                    continue

                finite_expiries += 1
                earliest_expiry = expires_at if earliest_expiry is None else min(earliest_expiry, expires_at)
                latest_expiry = expires_at if latest_expiry is None else max(latest_expiry, expires_at)
                if expires_at <= now:
                    expired_expiries += 1
                else:
                    future_expiries += 1
    except Exception:
        return state

    state["readable"] = True
    state["cookieCount"] = total
    state["expiredCookieCount"] = expired_expiries
    state["nonExpiredCookieCount"] = future_expiries
    state["sessionCookieCount"] = session_expiries
    state["earliestExpiry"] = earliest_expiry
    state["latestExpiry"] = latest_expiry
    state["loaded"] = total > 0
    if expired_expiries and future_expiries:
        state["expired"] = "PARTIAL"
    elif finite_expiries and future_expiries:
        state["expired"] = "NO"
    elif finite_expiries and expired_expiries == finite_expiries:
        state["expired"] = "YES"
    elif finite_expiries:
        state["expired"] = "NO"

    return state
