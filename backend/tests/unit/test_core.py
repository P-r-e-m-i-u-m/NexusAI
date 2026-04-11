import pytest
from unittest.mock import AsyncMock, patch
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.agents.engine import AgentConfig, AgentExecutor, Crew, TaskConfig
from app.rag.pipeline import DocumentProcessor


# ── Security tests ────────────────────────────────────────────
def test_password_hash_verify():
    hashed = hash_password("mysecret123")
    assert verify_password("mysecret123", hashed)
    assert not verify_password("wrongpass", hashed)


def test_jwt_encode_decode():
    token = create_access_token({"sub": "user123", "role": "developer"})
    payload = decode_token(token)
    assert payload["sub"] == "user123"
    assert payload["role"] == "developer"


# ── Document processor tests ──────────────────────────────────
def test_chunking():
    processor = DocumentProcessor(chunk_size=10, chunk_overlap=2)
    text = " ".join([f"word{i}" for i in range(30)])
    chunks = processor.chunk(text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.split()) <= 10


# ── Agent tests ────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_agent_run():
    config = AgentConfig(
        name="TestAgent", role="Tester",
        goal="Run tests", backstory="I test things",
    )
    executor = AgentExecutor(config)
    with patch("app.agents.engine.chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = "Test result"
        result = await executor.run("Do a test task")
    assert result == "Test result"
    assert len(executor.memory) == 2


@pytest.mark.asyncio
async def test_crew_run():
    agents = [
        AgentConfig(name="Researcher", role="Research", goal="Research stuff", backstory="Expert"),
        AgentConfig(name="Writer", role="Write", goal="Write stuff", backstory="Writer"),
    ]
    tasks = [
        TaskConfig(description="Research topic X", expected_output="Research notes", agent_name="Researcher"),
        TaskConfig(description="Write report", expected_output="Final report", agent_name="Writer"),
    ]
    crew = Crew(agents, tasks)
    with patch("app.agents.engine.chat", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = "Mock output"
        result = await crew.run()
    assert "results" in result
    assert "Researcher" in result["results"]
    assert "Writer" in result["results"]


# ── Health check test ──────────────────────────────────────────
@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
