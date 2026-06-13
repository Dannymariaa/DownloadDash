import logging

logger = logging.getLogger("DownloadDashFlaskApi")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def log_bandwidth(platform: str, content_length: str | int | None, url: str | None = None):
    if content_length is None:
        return

    try:
        size = float(content_length)
        if size <= 0:
            return
        megabytes = size / 1024.0 / 1024.0
        logger.info(
            "[bandwidth] %s %.2f MB %s",
            platform,
            megabytes,
            url or "",
        )
    except (TypeError, ValueError):
        pass
