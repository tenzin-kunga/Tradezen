from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from app.routes.ingestion import router

pytestmark = pytest.mark.asyncio


class FakeIngestionService:
    def __init__(self):
        self.upsert_calls = []
        self.delete_calls = []
        self.upsert_result = {"status": "upserted", "document_id": "d1"}
        self.delete_result = {"status": "deleted", "deleted": 1}

    async def upsert_document(self, user_id, source_type, source_id, content, metadata=None):
        self.upsert_calls.append((user_id, source_type, source_id, content, metadata))
        return self.upsert_result

    async def delete_document(self, user_id, source_type, source_id):
        self.delete_calls.append((user_id, source_type, source_id))
        return self.delete_result


def make_app(ingestion_service):
    app = FastAPI()
    app.state.container = type(
        "Container", (), {"ingestion_service": ingestion_service}
    )()
    app.include_router(router)
    return app


async def call_document(app, body):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.post("/ingest/document", json=body)


async def test_upsert_routes_to_service():
    svc = FakeIngestionService()
    app = make_app(svc)

    resp = await call_document(
        app,
        {
            "action": "upsert",
            "user_id": "u1",
            "source_type": "trade",
            "source_id": "trade-1",
            "content": "Bought AAPL at 150",
            "metadata": {"symbol": "AAPL"},
        },
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "upserted"
    assert svc.upsert_calls == [
        ("u1", "trade", "trade-1", "Bought AAPL at 150", {"symbol": "AAPL"})
    ]


async def test_upsert_without_metadata_passes_none():
    svc = FakeIngestionService()
    app = make_app(svc)

    resp = await call_document(
        app,
        {
            "action": "upsert",
            "user_id": "u1",
            "source_type": "journal",
            "source_id": "j1",
            "content": "Good day",
        },
    )
    assert resp.status_code == 200
    assert svc.upsert_calls[0][4] is None


async def test_upsert_missing_content_400():
    app = make_app(FakeIngestionService())

    resp = await call_document(
        app,
        {
            "action": "upsert",
            "user_id": "u1",
            "source_type": "trade",
            "source_id": "t1",
        },
    )
    assert resp.status_code == 400


async def test_delete_routes_to_service():
    svc = FakeIngestionService()
    app = make_app(svc)

    resp = await call_document(
        app,
        {
            "action": "delete",
            "user_id": "u1",
            "source_type": "trade",
            "source_id": "trade-1",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"
    assert svc.delete_calls == [("u1", "trade", "trade-1")]


async def test_delete_does_not_require_content():
    svc = FakeIngestionService()
    app = make_app(svc)

    resp = await call_document(
        app,
        {
            "action": "delete",
            "user_id": "u1",
            "source_type": "trade",
            "source_id": "t1",
            "content": "",
        },
    )
    assert resp.status_code == 200
    assert svc.delete_calls == [("u1", "trade", "t1")]


async def test_unknown_action_422():
    app = make_app(FakeIngestionService())

    resp = await call_document(
        app,
        {
            "action": "explode",
            "user_id": "u1",
            "source_type": "trade",
            "source_id": "t1",
            "content": "x",
        },
    )
    assert resp.status_code == 422


async def test_service_unavailable_503():
    app = make_app(None)

    resp = await call_document(
        app,
        {
            "action": "upsert",
            "user_id": "u1",
            "source_type": "trade",
            "source_id": "t1",
            "content": "x",
        },
    )
    assert resp.status_code == 503
