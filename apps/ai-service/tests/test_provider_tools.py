from __future__ import annotations

import pytest

from app.providers.cloud import CloudProvider
from app.providers.factory import ProviderFactory


@pytest.mark.asyncio
async def test_factory_falls_back_to_cloud_for_unknown_provider(config):
    factory = ProviderFactory(config)

    provider = factory.get("custom")

    assert isinstance(provider, CloudProvider)
    assert factory.get("custom") is provider  # cached, not recreated


class _FakeResp:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, payload: dict):
        self._payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, headers=None, json=None):
        self.sent = json
        return _FakeResp(self._payload)


@pytest.mark.asyncio
async def test_raw_chat_forwards_tools_and_returns_tool_calls(monkeypatch):
    provider = CloudProvider(api_key="test")
    body = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": "win rate?"}],
        "tools": [{"type": "function", "function": {"name": "get_analytics"}}],
        "tool_choice": "auto",
        "stream": False,
    }
    fake = _FakeClient(
        {
            "model": "openai/gpt-4o-mini",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "",
                        "tool_calls": [
                            {
                                "id": "call_1",
                                "type": "function",
                                "function": {"name": "get_analytics", "arguments": "{}"},
                            }
                        ],
                    }
                }
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        }
    )
    monkeypatch.setattr("httpx.AsyncClient", lambda *a, **k: fake)

    result = await provider.raw_chat(body)

    assert result["choices"][0]["message"]["tool_calls"][0]["function"]["name"] == "get_analytics"
    assert fake.sent["tools"] == body["tools"]
    assert fake.sent["tool_choice"] == "auto"


class _FakeStreamClient:
    def __init__(self, lines: list[str]):
        self._lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def stream(self, method, url, headers=None, json=None):
        self.sent = json
        return _FakeStreamResp(self._lines)


class _FakeStreamResp:
    def __init__(self, lines: list[str]):
        self._lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def raise_for_status(self):
        return None

    async def aiter_lines(self):
        for line in self._lines:
            yield line


@pytest.mark.asyncio
async def test_stream_captures_usage_and_requests_include_usage(monkeypatch):
    provider = CloudProvider(api_key="test")
    usage_out: dict = {}
    lines = [
        'data: {"choices":[{"delta":{"content":"hi "}}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}',
        "data: [DONE]",
    ]
    fake = _FakeStreamClient(lines)
    monkeypatch.setattr("httpx.AsyncClient", lambda *a, **k: fake)

    tokens = [t async for t in provider.stream([{"role": "user", "content": "x"}], usage_out=usage_out)]

    assert tokens == ["hi "]
    assert usage_out == {"prompt_tokens": 12, "completion_tokens": 3, "total_tokens": 15}
    assert fake.sent["stream_options"] == {"include_usage": True}
