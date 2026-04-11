import time
import redis.asyncio as aioredis
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.core.logging import logger

BACKOFF = [60, 300, 900, 3600]  # 1min, 5min, 15min, 1hr
MAX_ATTEMPTS = 5
LOCKOUT_THRESHOLD = 10
BLOCK_THRESHOLD = 20


class BruteForceMiddleware(BaseHTTPMiddleware):
    LOGIN_PATH = "/api/v1/auth/login"

    def __init__(self, app):
        super().__init__(app)
        self._redis = None

    async def get_redis(self):
        if not self._redis:
            self._redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def dispatch(self, request: Request, call_next):
        if request.url.path != self.LOGIN_PATH or request.method != "POST":
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        r = await self.get_redis()
        fail_key = f"bf:fail:{ip}"
        block_key = f"bf:block:{ip}"

        if await r.exists(block_key):
            ttl = await r.ttl(block_key)
            return JSONResponse(
                status_code=429,
                content={"error": "IP temporarily blocked due to too many failed attempts", "retry_after": ttl},
                headers={"Retry-After": str(ttl)},
            )

        response = await call_next(request)

        if response.status_code == 401:
            fails = await r.incr(fail_key)
            await r.expire(fail_key, 900)
            logger.warning("failed_login", ip=ip, attempts=fails)

            if int(fails) >= BLOCK_THRESHOLD:
                await r.setex(block_key, 86400, "blocked")
                logger.warning("ip_blocked", ip=ip)
            elif int(fails) >= LOCKOUT_THRESHOLD:
                await r.setex(block_key, 3600, "locked")
            elif int(fails) >= MAX_ATTEMPTS:
                backoff_idx = min(int(fails) - MAX_ATTEMPTS, len(BACKOFF) - 1)
                await r.setex(block_key, BACKOFF[backoff_idx], "backoff")
        elif response.status_code == 200:
            await r.delete(fail_key)

        return response
