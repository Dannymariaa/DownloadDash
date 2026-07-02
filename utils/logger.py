import logging
import sys

from config import Config


def setup_logger():
    logger = logging.getLogger("downloaddash")
    logger.setLevel(Config.LOG_LEVEL)
    logger.propagate = False

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
        )
        logger.addHandler(handler)

    return logger


logger = setup_logger()
