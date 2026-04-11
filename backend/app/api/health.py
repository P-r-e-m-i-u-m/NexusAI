from fastapi import APIRouter
from fastapi.responses import JSONResponse
import redis.asyncio as aioredis
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.core.config import settings
from app.core.circuit_breaker import all_circuits
from app.core.cache import cache

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@router.get("/health/live")
async def liveness():
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness():
    checks = {}

    # DB check
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Redis check
    try:
        r = await aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    from app.db.session import get_pool_status
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "status": "ready" if all_ok else "not_ready",
            "checks": checks,
            "circuits": all_circuits(),
            "cache": cache.stats(),
            "db_pool": get_pool_status(),
        },
    )
