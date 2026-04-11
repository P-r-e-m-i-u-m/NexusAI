import pytest


@pytest.mark.asyncio
async def test_create_agent(authenticated_client):
    resp = await authenticated_client.post("/api/v1/agents/", json={
        "name": "Research Agent",
        "role": "Senior Researcher",
        "goal": "Research topics thoroughly",
        "backstory": "Expert researcher with 10 years experience",
        "model": "openai/gpt-oss-120b",
        "provider": "nvidia",
    })
    assert resp.status_code == 201
    assert "id" in resp.json()


@pytest.mark.asyncio
async def test_run_agent(authenticated_client, mock_llm):
    create = await authenticated_client.post("/api/v1/agents/", json={
        "name": "Test Agent", "role": "Tester",
        "goal": "Test things", "backstory": "I test",
    })
    agent_id = create.json()["id"]

    resp = await authenticated_client.post(
        f"/api/v1/agents/{agent_id}/run",
        json={"task": "Summarize the benefits of AI"},
    )
    assert resp.status_code == 200
    assert "result" in resp.json()
    assert resp.json()["result"] == "Mocked LLM response for testing"


@pytest.mark.asyncio
async def test_run_agent_not_found(authenticated_client):
    resp = await authenticated_client.post(
        "/api/v1/agents/nonexistent-id/run",
        json={"task": "Do something"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_crew_run(authenticated_client, mock_llm):
    resp = await authenticated_client.post("/api/v1/agents/crew/run", json={
        "agents": [
            {"name": "Researcher", "role": "Research", "goal": "Find info", "backstory": "Expert"},
            {"name": "Writer", "role": "Write", "goal": "Write report", "backstory": "Writer"},
        ],
        "tasks": [
            {"description": "Research AI trends", "expected_output": "Research notes", "agent_name": "Researcher"},
            {"description": "Write a report", "expected_output": "Final report", "agent_name": "Writer"},
        ],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert "Researcher" in data["results"]
    assert "Writer" in data["results"]


@pytest.mark.asyncio
async def test_dev_agent_run(authenticated_client, mock_llm):
    import json
    mock_llm.return_value = json.dumps({
        "steps": [{"id": 1, "description": "Create hello world", "type": "code"}]
    })
    resp = await authenticated_client.post("/api/v1/agents/dev/run", json={
        "task": "Create a hello world Python script",
        "provider": "nvidia",
    })
    assert resp.status_code == 200
    assert "task" in resp.json()
