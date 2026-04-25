import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.tracing import setup_tracing
from app.core.shutdown import setup_shutdown_handlers
from app.db.session import engine, Base
from app.api.v1.router import api_router
from app.api.health import router as health_router
from app.api.gdpr import router as gdpr_router
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.validator import InputValidationMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.middleware.brute_force import BruteForceMiddleware

setup_logging()
setup_shutdown_handlers()

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN, traces_sample_rate=0.2, environment=settings.APP_ENV
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="NexusAI",
    description="Unified AI Agent Platform — enterprise grade",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware, per_minute=100, per_hour=1000)
app.add_middleware(BruteForceMiddleware)
app.add_middleware(InputValidationMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"],
    max_age=3600,
)

setup_tracing(app)
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

app.include_router(health_router)
app.include_router(gdpr_router)
app.include_router(api_router, prefix="/api/v1")
