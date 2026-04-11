import pytest
import io


@pytest.mark.asyncio
async def test_create_knowledge_base(authenticated_client):
    resp = await authenticated_client.post("/api/v1/rag/kb", json={
        "name": "Test KB", "description": "Integration test KB"
    })
    assert resp.status_code == 201
    assert "id" in resp.json()


@pytest.mark.asyncio
async def test_upload_txt_document(authenticated_client, mock_embed):
    kb = await authenticated_client.post("/api/v1/rag/kb", json={"name": "Upload KB"})
    kb_id = kb.json()["id"]

    content = b"NexusAI is an enterprise AI platform. It supports agents, RAG, and workflows."
    resp = await authenticated_client.post(
        f"/api/v1/rag/kb/{kb_id}/upload",
        files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "indexed"
    assert resp.json()["chunks"] > 0


@pytest.mark.asyncio
async def test_rag_query(authenticated_client, mock_embed, mock_llm):
    kb = await authenticated_client.post("/api/v1/rag/kb", json={"name": "Query KB"})
    kb_id = kb.json()["id"]

    content = b"NexusAI supports NVIDIA LLMs and multi-agent workflows."
    await authenticated_client.post(
        f"/api/v1/rag/kb/{kb_id}/upload",
        files={"file": ("doc.txt", io.BytesIO(content), "text/plain")},
    )

    resp = await authenticated_client.post(f"/api/v1/rag/kb/{kb_id}/query", json={
        "question": "What LLMs does NexusAI support?",
        "provider": "nvidia",
    })
    assert resp.status_code == 200
    assert "answer" in resp.json()
    assert "sources" in resp.json()


@pytest.mark.asyncio
async def test_list_documents(authenticated_client, mock_embed):
    kb = await authenticated_client.post("/api/v1/rag/kb", json={"name": "List KB"})
    kb_id = kb.json()["id"]

    for i in range(2):
        await authenticated_client.post(
            f"/api/v1/rag/kb/{kb_id}/upload",
            files={"file": (f"doc{i}.txt", io.BytesIO(b"content"), "text/plain")},
        )

    resp = await authenticated_client.get(f"/api/v1/rag/kb/{kb_id}/documents")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_rag_empty_kb(authenticated_client, mock_embed, mock_llm):
    kb = await authenticated_client.post("/api/v1/rag/kb", json={"name": "Empty KB"})
    kb_id = kb.json()["id"]

    resp = await authenticated_client.post(f"/api/v1/rag/kb/{kb_id}/query", json={
        "question": "What is the meaning of life?"
    })
    assert resp.status_code == 200
    assert "answer" in resp.json()
