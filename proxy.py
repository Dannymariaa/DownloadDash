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


def _create_session():
    session = requests.Session()
    session.trust_env = False
    session.verify = Config.VERIFY_TLS
    session.headers.clear()
    session.headers.update(MINIMAL_HEADERS)
    session.max_redirects = 1

    if Config.PROXY_URL:
        session.proxies.update({"http": Config.PROXY_URL, "https": Config.PROXY_URL})

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
        bool(Config.PROXY_URL),
    )
    return session


session = _create_session()
