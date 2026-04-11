import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_sql_injection_blocked(client):
    res = await client.post("/api/v1/agents/", json={"name": "'; DROP TABLE users; --", "role": "x", "goal": "x", "backstory": "x"})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_xss_blocked(client):
    res = await client.post("/api/v1/agents/", json={"name": "<script>alert(1)</script>", "role": "x", "goal": "x", "backstory": "x"})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_security_headers_present(client):
    res = await client.get("/health")
    assert "x-frame-options" in res.headers
    assert "x-content-type-options" in res.headers
    assert "x-xss-protection" in res.headers


@pytest.mark.asyncio
async def test_health_live(client):
    res = await client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "alive"


@pytest.mark.asyncio
async def test_unauthorized_access(client):
    res = await client.get("/api/v1/users/")
    assert res.status_code in (401, 403, 422)
