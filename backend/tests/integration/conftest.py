import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from unittest.mock import AsyncMock, patch

from app.main import app
from app.db.session import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://nexusai:nexusai_secret@localhost:5432/nexusai_test"

test_engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestSession() as session:
        yield session
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(test_db):
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def authenticated_client(client):
    # Register
    await client.post("/api/v1/auth/register", json={
        "email": "test@nexusai.com",
        "username": "testuser",
        "password": "testpass123",
    })
    # Login
    resp = await client.post("/api/v1/auth/login", data={
        "username": "test@nexusai.com",
        "password": "testpass123",
    })
    token = resp.json().get("access_token", "")
    client.headers.update({"Authorization": f"Bearer {token}"})
    yield client


@pytest.fixture
def mock_llm():
    with patch("app.services.llm.chat", new_callable=AsyncMock) as mock:
        mock.return_value = "Mocked LLM response for testing"
        yield mock


@pytest.fixture
def mock_embed():
    with patch("app.services.llm.embed", new_callable=AsyncMock) as mock:
        mock.return_value = [0.1] * 1536
        yield mock
