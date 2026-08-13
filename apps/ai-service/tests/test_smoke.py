from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "providers" in data
    assert "features" in data


async def test_providers_health(client, auth_headers):
    resp = await client.get("/providers/health", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "ollama" in data or "cloud" in data


async def test_chat_unauthorized(client, chat_payload):
    resp = await client.post("/chat", json=chat_payload)
    assert resp.status_code == 401


async def test_chat_returns_response(client, auth_headers, chat_payload):
    resp = await client.post("/chat", json=chat_payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "content" in data
    assert "model" in data
    assert "request_id" in data
    assert len(data["content"]) > 0


async def test_chat_analytics_intent(client, auth_headers):
    payload = {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "messages": [{"role": "user", "content": "What is my win rate?"}],
        "stream": False,
    }
    resp = await client.post("/chat", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    meta = data.get("metadata", {})
    assert meta.get("intent") == "analytics"


async def test_chat_coach_intent(client, auth_headers):
    payload = {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "messages": [{"role": "user", "content": "Help me improve my discipline."}],
        "stream": False,
    }
    resp = await client.post("/chat", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    meta = data.get("metadata", {})
    assert meta.get("intent") == "coach"


async def test_chat_journal_intent(client, auth_headers):
    payload = {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "messages": [{"role": "user", "content": "What did I trade yesterday?"}],
        "stream": False,
    }
    resp = await client.post("/chat", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    meta = data.get("metadata", {})
    assert meta.get("intent") == "journal"


async def test_chat_research_endpoint(client, auth_headers):
    payload = {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "messages": [{"role": "user", "content": "Analyze AAPL stock."}],
        "stream": False,
    }
    resp = await client.post("/chat/research", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "content" in data


async def test_openai_adapter(client, auth_headers):
    payload = {
        "model": "qwen3",
        "messages": [{"role": "user", "content": "Hello"}],
        "stream": False,
    }
    resp = await client.post(
        "/v1/chat/completions",
        json=payload,
        headers={**auth_headers, "Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "choices" in data
    assert "model" in data
