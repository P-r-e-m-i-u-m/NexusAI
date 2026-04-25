import time
import redis.asyncio as aioredis
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

WHITELIST = {"127.0.0.1", "::1", "backend", "worker"}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, per_minute: int = 100, per_hour: int = 1000):
        super().__init__(app)
        self.per_minute = per_minute
        self.per_hour = per_hour
        self._redis = None

    async def get_redis(self):
        if not self._redis:
            self._redis = await aioredis.from_url(
                settings.REDIS_URL, decode_responses=True
            )
        return self._redis

    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"

        if ip in WHITELIST or request.url.path in (
            "/health",
            "/metrics",
            "/docs",
            "/redoc",
        ):
            return await call_next(request)

        r = await self.get_redis()
        now = int(time.time())
        minute_key = f"rl:ip:{ip}:min:{now // 60}"
        hour_key = f"rl:ip:{ip}:hour:{now // 3600}"

        pipe = r.pipeline()
        pipe.incr(minute_key)
        pipe.expire(minute_key, 120)
        pipe.incr(hour_key)
        pipe.expire(hour_key, 7200)
        results = await pipe.execute()

        min_count, _, hour_count, _ = results
        remaining_min = max(0, self.per_minute - int(min_count))
        remaining_hour = max(0, self.per_hour - int(hour_count))
        reset_at = (now // 60 + 1) * 60

        if int(min_count) > self.per_minute or int(hour_count) > self.per_hour:
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests", "retry_after": reset_at - now},
                headers={
                    "Retry-After": str(reset_at - now),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_at),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(
            min(remaining_min, remaining_hour)
        )
        response.headers["X-RateLimit-Reset"] = str(reset_at)
        response.headers["X-RateLimit-Limit"] = str(self.per_minute)
        return response
