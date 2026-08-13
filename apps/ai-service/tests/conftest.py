from __future__ import annotations

import os
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class MockProvider:
    """Canned LLM provider for testing. No real API calls."""

    name = "mock"

    def __init__(self):
        from app.models.provider import ProviderCapabilities
        self.capabilities = ProviderCapabilities(
            supports_streaming=True,
            supports_tools=False,
            supports_reasoning=False,
            supports_json=False,
            supports_vision=False,
            supports_embeddings=False,
            max_context=32768,
        )

    async def chat(self, messages, *, model=None, temperature=0.4, max_tokens=None, stream=False):
        last_msg = messages[-1] if messages else {}
        content = last_msg.get("content", "Mock response")
        return {
            "content": f"Mock: {content}",
            "model": model or "mock-model",
            "usage": {"prompt_tokens": 10, "completion_tokens": 5},
        }

    async def ensure_model(self, model: str) -> bool:
        return True

    async def health_check(self) -> bool:
        return True

    async def stream(self, messages, *, model=None, temperature=0.4, max_tokens=None, api_key=None):
        last_msg = messages[-1] if messages else {}
        content = last_msg.get("content", "Mock response")
        for word in f"Mock: {content}".split():
            yield word + " "

    async def health_check(self):
        return True

    async def list_models(self) -> list[dict]:
        return [
            {
                "id": "mock-model",
                "provider": "mock",
                "contextWindow": 32768,
            }
        ]

    async def health(self) -> dict:
        return {
            "status": "healthy",
            "latency": 0,
            "lastChecked": None,
            "reason": None,
        }


@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def config():
    from app.config import Config
    os.environ.setdefault("DATABASE_URL", "postgresql://postgres:pass@localhost:5432/tradezen")
    os.environ.setdefault("AI_PROVIDER", "ollama")
    os.environ.setdefault("DEFAULT_MODEL", "qwen3:latest")
    return Config.from_env()


@pytest_asyncio.fixture(scope="session")
async def container(config):
    from app.container import Container
    c = Container(config)
    # Inject mock provider so tests don't hit real LLMs
    mock = MockProvider()
    c.provider_factory._providers["ollama"] = mock
    c.provider_factory._providers["cloud"] = mock
    c.provider_health.set("ollama", True)
    c.provider_health.set("cloud", True)
    await c.initialize()
    yield c
    await c.close()


@pytest_asyncio.fixture(scope="session")
async def app(container):
    from app.main import create_app
    application = create_app()
    application.state.container = container
    yield application


@pytest_asyncio.fixture
async def client(app):
    import httpx
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=httpx.Timeout(120.0)) as ac:
        yield ac


@pytest.fixture
def mock_provider():
    return MockProvider()


@pytest.fixture
def auth_headers():
    return {"x-internal-api-key": "tradezen-internal"}


@pytest.fixture
def chat_payload():
    return {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "messages": [{"role": "user", "content": "What is my win rate?"}],
        "stream": False,
    }
