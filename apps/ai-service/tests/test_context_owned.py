from __future__ import annotations

import types

import pytest
from fastapi import FastAPI, Request
from httpx import AsyncClient, ASGITransport

from app.models.chat import ChatRequest, Message
from app.models.session import AISession
from app.routes.openai import router as openai_router

pytestmark = pytest.mark.asyncio


class FakeModelRouter:
    def select(self, intent=None, requested_model=None):
        return "cloud", requested_model or "model-x"


class FakeProviderFactory:
    def __init__(self):
        self.provider = object()

    def get(self, name):
        return self.provider


class Exploding:
    """Raise if touched — the whole point is these are skipped."""

    def __init__(self, label):
        self._label = label

    def __getattr__(self, name):
        raise AssertionError(f"{self._label}.{name} must not be called")


class FakeCompletion:
    def __init__(self):
        self.calls = []

    async def complete(self, session, messages):
        self.calls.append(messages)
        return {
            "content": "reply",
            "model": session.model,
            "usage": {"prompt_tokens": 3, "completion_tokens": 1},
        }

    async def stream(self, session, messages, api_key=None, base_url=None):
        self.calls.append(messages)
        for word in "reply".split():
            yield word + " "


def make_service(completion=None):
    from app.services.chat_service import ChatService

    return ChatService(
        intent_router=Exploding("intent_router"),
        agent_registry=Exploding("agent_registry"),
        execution_planner=Exploding("execution_planner"),
        model_router=FakeModelRouter(),
        provider_factory=FakeProviderFactory(),
        completion_service=completion or FakeCompletion(),
        config=None,
        retrieval_pipeline=Exploding("retrieval"),
        memory_manager=Exploding("memory"),
        direct_strategy=Exploding("direct_strategy"),
        tool_strategy=None,
        memory_extractor=None,
        feature_flags=None,
        query_planner=Exploding("query_planner"),
        execution_engine=Exploding("execution_engine"),
        traces_repo=None,
    )


def make_request(messages, context_owned=False):
    return ChatRequest(
        user_id="u1",
        messages=[Message(role="system", content="ctx")] + messages,
        model="model-x",
        context_owned=context_owned,
    )


async def test_build_context_passthrough_skips_rag():
    svc = make_service()
    request = make_request(
        [Message(role="user", content="hi")], context_owned=True
    )
    session = AISession()
    ctx = await svc.build_context(request, session)

    assert ctx.context_owned is True
    assert ctx.intent is None
    assert [m["role"] for m in ctx.messages] == ["system", "user"]
    assert ctx.messages[0]["content"] == "ctx"
    assert session.model == "model-x"
    assert session.metrics.model == "model-x"


async def test_handle_passthrough_calls_completion_directly():
    completion = FakeCompletion()
    svc = make_service(completion=completion)
    request = make_request(
        [Message(role="user", content="hi")], context_owned=True
    )
    session = AISession()
    resp = await svc.handle(request, session)

    assert resp.content == "reply"
    assert resp.metadata.get("context_owned") is True
    assert completion.calls[0][0]["content"] == "ctx"


async def test_handle_passthrough_stream_yields_tokens():
    completion = FakeCompletion()
    svc = make_service(completion=completion)
    request = make_request(
        [Message(role="user", content="hi")], context_owned=True
    )
    session = AISession()
    tokens = [t async for t in svc.handle_stream(request, session)]
    assert "".join(tokens).strip() == "reply"


async def test_context_owned_flows_through_openai_route():
    seen = {}

    async def fake_handle(request, session, api_key=None, base_url=None):
        seen["request"] = request
        from app.models.chat import ChatResponse, TokenUsage

        return ChatResponse(
            content="reply",
            model=request.model or "model-x",
            usage=TokenUsage(prompt_tokens=3, completion_tokens=1, total_tokens=4),
            request_id="r1",
        )

    app = make_route_app(fake_handle)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/chat/completions",
            json={
                "model": "model-x",
                "messages": [
                    {"role": "system", "content": "ctx"},
                    {"role": "user", "content": "hi"},
                ],
                "stream": False,
            },
            headers={
                "Content-Type": "application/json",
                "x-context-owned-by-nestjs": "true",
            },
        )
    assert resp.status_code == 200
    assert resp.json()["choices"][0]["message"]["content"] == "reply"
    assert seen["request"].context_owned is True
    assert seen["request"].messages[0].content == "ctx"


async def test_without_header_runs_normal_pipeline():
    """Old behavior preserved: no header → not passthrough (context_owned False)."""
    seen = {}

    async def fake_handle(request, session, api_key=None, base_url=None):
        seen["request"] = request
        from app.models.chat import ChatResponse, TokenUsage

        return ChatResponse(
            content="reply",
            model=request.model or "model-x",
            usage=TokenUsage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
            request_id="r1",
        )

    app = make_route_app(fake_handle)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/chat/completions",
            json={
                "model": "model-x",
                "messages": [{"role": "user", "content": "hi"}],
                "stream": False,
            },
            headers={"Content-Type": "application/json"},
        )
    assert resp.status_code == 200
    assert seen["request"].context_owned is False


def make_route_app(handle):
    """Bare app with the openai router + a session, like test_retrieval_route."""
    app = FastAPI()

    @app.middleware("http")
    async def set_session(request: Request, call_next):
        request.state.session = AISession(user_id="u1")
        return await call_next(request)

    app.state.container = type(
        "Container",
        (),
        {
            "config": type(
                "Config", (), {"provider_base_urls": {}}
            )(),
            "chat_service": types.SimpleNamespace(
                handle=handle, handle_stream=handle
            ),
            "model_registry": None,
            "provider_factory": None,
        },
    )()
    app.include_router(openai_router)
    return app
