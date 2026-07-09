from __future__ import annotations

import pytest

from app.providers.openrouter import OpenRouterProvider


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
    provider = OpenRouterProvider(api_key="test")
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
