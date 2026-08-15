from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from app.retrieval.pipeline import RetrievalOptions, RetrievalResult
from app.retrieval.policies import RetrievalPolicy
from app.models.common import RetrievedDocument
from app.routes.retrieval import router

pytestmark = pytest.mark.asyncio


class FakePipeline:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = []
        self.keyword = object()  # non-None → hybrid mode

    async def retrieve(self, user_id: str, query: str, options: RetrievalOptions):
        self.calls.append((user_id, query, options))
        if self.error:
            raise self.error
        return self.result


def make_app(pipeline, policy=None):
    app = FastAPI()
    app.state.container = type(
        "Container",
        (),
        {"retrieval_pipeline": pipeline, "retrieval_policy": policy or RetrievalPolicy()},
    )()
    app.include_router(router)
    return app


async def call_retrieval(app, body):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.post("/retrieval", json=body)


def sample_result():
    return RetrievalResult(
        documents=[
            RetrievedDocument(
                document_id="t1",
                source_type="trade",
                source_id="trade-1",
                content="Bought AAPL at 150",
                title="AAPL",
                score=0.91,
                metadata={"symbol": "AAPL"},
            )
        ],
        total_candidates=5,
        total_filtered=1,
        latency_ms=12.5,
        latency_breakdown={"embed": 2.0, "vector": 4.0},
    )


async def test_retrieval_returns_contract_shape():
    pipeline = FakePipeline(result=sample_result())
    app = make_app(pipeline)

    resp = await call_retrieval(
        app,
        {
            "user_id": "u1",
            "query": "AAPL analysis",
            "intent": "coach",
            "requestId": "req-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["requestId"] == "req-1"
    assert len(data["documents"]) == 1
    doc = data["documents"][0]
    assert doc["documentId"] == "t1"
    assert doc["sourceType"] == "trade"
    assert doc["content"] == "Bought AAPL at 150"
    assert doc["score"] == 0.91
    assert doc["retrievalMethod"] == "rrf"
    assert doc["metadata"]["symbol"] == "AAPL"
    assert data["debug"]["candidates"] == 5
    assert data["debug"]["filtered"] == 1
    assert data["debug"]["method"] == "hybrid"
    assert data["debug"]["breakdown"]["embed"] == 2.0


async def test_retrieval_maps_intent_to_policy():
    pipeline = FakePipeline(result=sample_result())
    app = make_app(pipeline)

    await call_retrieval(
        app,
        {
            "user_id": "u1",
            "query": "what did I write about liquidity",
            "intent": "coach",
            "requestId": "req-2",
        },
    )
    _, query, options = pipeline.calls[0]
    assert query == "what did I write about liquidity"
    assert options.top_k == 10  # coach policy
    assert options.min_score == 0.5
    assert options.max_tokens == 4000


async def test_retrieval_unknown_intent_falls_back_to_general():
    pipeline = FakePipeline(result=sample_result())
    app = make_app(pipeline)

    await call_retrieval(
        app,
        {
            "user_id": "u1",
            "query": "review my month",
            "intent": "review",  # not in Python policies → general
            "requestId": "req-3",
        },
    )
    _, _, options = pipeline.calls[0]
    assert options.top_k == 3
    assert options.min_score == 0.7


async def test_retrieval_source_types_passed_through():
    pipeline = FakePipeline(result=sample_result())
    app = make_app(pipeline)

    await call_retrieval(
        app,
        {
            "user_id": "u1",
            "query": "my trades",
            "intent": "chat",
            "sourceTypes": ["trade"],
            "requestId": "req-4",
        },
    )
    _, _, options = pipeline.calls[0]
    assert options.source_types == ["trade"]


async def test_retrieval_empty_results_never_404():
    pipeline = FakePipeline(result=RetrievalResult(documents=[]))
    app = make_app(pipeline)

    resp = await call_retrieval(
        app,
        {"user_id": "u1", "query": "nothing here", "intent": "chat", "requestId": "req-5"},
    )
    assert resp.status_code == 200
    assert resp.json()["documents"] == []


async def test_retrieval_pipeline_failure_degrades_to_empty():
    pipeline = FakePipeline(error=RuntimeError("vector down"))
    app = make_app(pipeline)

    resp = await call_retrieval(
        app,
        {"user_id": "u1", "query": "query", "intent": "chat", "requestId": "req-6"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["documents"] == []
    assert data["debug"]["degraded"] is True


async def test_retrieval_missing_query_400():
    pipeline = FakePipeline(result=sample_result())
    app = make_app(pipeline)

    resp = await call_retrieval(
        app,
        {"user_id": "u1", "intent": "chat", "requestId": "req-7"},
    )
    assert resp.status_code == 400


async def test_retrieval_requires_user_id():
    pipeline = FakePipeline(result=sample_result())
    app = make_app(pipeline)

    resp = await call_retrieval(
        app,
        {"query": "query", "intent": "chat", "requestId": "req-8"},
    )
    assert resp.status_code == 400
