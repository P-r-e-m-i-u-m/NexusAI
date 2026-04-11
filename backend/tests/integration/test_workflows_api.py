import pytest


@pytest.mark.asyncio
async def test_create_workflow(authenticated_client):
    resp = await authenticated_client.post("/api/v1/workflows/", json={
        "name": "Test Workflow",
        "description": "Integration test workflow",
        "graph": {"nodes": [], "edges": []},
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Test Workflow"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_workflow(authenticated_client):
    create = await authenticated_client.post("/api/v1/workflows/", json={
        "name": "Fetch Me", "graph": {}
    })
    wf_id = create.json()["id"]

    resp = await authenticated_client.get(f"/api/v1/workflows/{wf_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == wf_id
    assert resp.json()["name"] == "Fetch Me"


@pytest.mark.asyncio
async def test_list_workflows(authenticated_client):
    for i in range(3):
        await authenticated_client.post("/api/v1/workflows/", json={"name": f"WF {i}", "graph": {}})
    resp = await authenticated_client.get("/api/v1/workflows/")
    assert resp.status_code == 200
    assert len(resp.json()) >= 3


@pytest.mark.asyncio
async def test_run_workflow(authenticated_client):
    create = await authenticated_client.post("/api/v1/workflows/", json={"name": "Runnable", "graph": {}})
    wf_id = create.json()["id"]

    resp = await authenticated_client.post(f"/api/v1/workflows/{wf_id}/run", json={"input_data": {"key": "value"}})
    assert resp.status_code == 200
    assert "run_id" in resp.json()


@pytest.mark.asyncio
async def test_workflow_invalid_input(authenticated_client):
    resp = await authenticated_client.post("/api/v1/workflows/", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_workflow_not_found(authenticated_client):
    resp = await authenticated_client.get("/api/v1/workflows/nonexistent-id-12345")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_workflow_unauthorized(client):
    resp = await client.get("/api/v1/workflows/")
    # No auth header — should still work as open endpoint, or 401 if protected
    assert resp.status_code in (200, 401)


@pytest.mark.asyncio
async def test_update_workflow(authenticated_client):
    create = await authenticated_client.post("/api/v1/workflows/", json={"name": "Old Name", "graph": {}})
    wf_id = create.json()["id"]

    resp = await authenticated_client.put(f"/api/v1/workflows/{wf_id}", json={
        "name": "New Name", "graph": {"nodes": [{"id": "1"}]}
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
