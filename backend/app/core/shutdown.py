import signal
import asyncio
from app.core.logging import logger

_shutdown_event = asyncio.Event()


def setup_shutdown_handlers():
    def _handler(sig, frame):
        logger.info("shutdown_signal_received", signal=sig)
        _shutdown_event.set()

    signal.signal(signal.SIGTERM, _handler)
    signal.signal(signal.SIGINT, _handler)
    logger.info("shutdown_handlers_registered")


async def wait_for_shutdown():
    await _shutdown_event.wait()
    logger.info("graceful_shutdown_started")
    await asyncio.sleep(2)
    logger.info("shutdown_complete")
