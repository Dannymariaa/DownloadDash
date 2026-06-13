import os
from dotenv import load_dotenv
import requests

load_dotenv()

PROXY = os.getenv("PROXY")

_session = None


def get_proxy_session() -> requests.Session:
    global _session
    if _session is not None:
        return _session

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    })
    session.max_redirects = 5
    session.trust_env = False

    if PROXY:
        session.proxies.update({"http": PROXY, "https": PROXY})

    _session = session
    return _session
