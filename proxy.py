import atexit

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import Config
from utils.logger import logger

MINIMAL_HEADERS = {
    "Accept": "text/html,application/json,application/ld+json",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36",
}


def _create_session(proxy_url=None):
    session = requests.Session()
    session.trust_env = False
    session.verify = Config.VERIFY_TLS
    session.headers.clear()
    session.headers.update(MINIMAL_HEADERS)
    session.max_redirects = 1

    if proxy_url:
        session.proxies.update({"http": proxy_url, "https": proxy_url})

    retry = Retry(
        total=Config.RETRY_TOTAL,
        connect=Config.RETRY_TOTAL,
        read=0,
        status=Config.RETRY_TOTAL,
        backoff_factor=Config.RETRY_BACKOFF,
        status_forcelist=(408, 425, 429, 500, 502, 503, 504),
        allowed_methods=frozenset(("HEAD", "GET")),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=Config.CONNECTION_POOL_CONNECTIONS,
        pool_maxsize=Config.CONNECTION_POOL_MAXSIZE,
        pool_block=True,
    )
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    logger.info(
        "global requests session ready pool_connections=%s pool_maxsize=%s proxy=%s",
        Config.CONNECTION_POOL_CONNECTIONS,
        Config.CONNECTION_POOL_MAXSIZE,
        bool(proxy_url),
    )
    return session


direct_session = _create_session()
proxy_session = _create_session(Config.PROXY_URL) if Config.PROXY_URL else None


def session_for_proxy(use_proxy=False):
    if use_proxy and proxy_session is not None:
        return proxy_session
    return direct_session


def close_session():
    direct_session.close()
    if proxy_session is not None:
        proxy_session.close()


atexit.register(close_session)
