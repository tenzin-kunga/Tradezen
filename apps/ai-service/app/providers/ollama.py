from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, AsyncIterator

import httpx

from ..models.provider import ProviderCapabilities

logger = logging.getLogger("ai_service.providers")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OllamaProvider:
    """Ollama local model provider."""

    name = "ollama"

    def __init__(self, host: str = "http://localhost:11434", timeout: int = 60):
        self.host = host.rstrip("/")
        self.timeout = timeout
        self.capabilities = ProviderCapabilities(
            supports_streaming=True,
            supports_tools=False,
            supports_reasoning=True,
            supports_json=True,
            supports_vision=False,
            supports_embeddings=False,
            max_context=32768,
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int | None = None,
        stream: bool = False,
        **kwargs,
    ) -> dict[str, Any]:
        model = model or "qwen3:latest"
        prompt = self._messages_to_prompt(messages)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.host}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "content": data.get("response", ""),
                "model": data.get("model", ""),
                "usage": {
                    "prompt_tokens": data.get("prompt_eval_count", 0),
                    "completion_tokens": data.get("eval_count", 0),
                },
            }

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int | None = None,
        **kwargs,
    ) -> AsyncIterator[str]:
        model = model or "qwen3:latest"
        prompt = self._messages_to_prompt(messages)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.host}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {"temperature": temperature},
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue

                    try:
                        chunk = json.loads(line)
                        content = chunk.get("response", "")
                        if content:
                            yield content
                        if chunk.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.host}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[dict]:
        """Raw discovery — providers return only what they know.

        Ollama's /api/tags does not expose context length, so we leave it as
        None and let the ModelRegistry enrich known models.
        """
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.host}/api/tags")
                resp.raise_for_status()
                models = resp.json().get("models", [])
                return [
                    {
                        "id": m["name"],
                        "provider": "ollama",
                        "contextWindow": None,
                    }
                    for m in models
                ]
        except Exception as e:
            logger.warning(f"Ollama model discovery failed: {e}")
            return []

    async def health(self) -> dict:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.host}/api/tags")
                latency = int((time.time() - start) * 1000)
                return {
                    "status": "healthy" if resp.status_code == 200 else "degraded",
                    "latency": latency,
                    "lastChecked": _now_iso(),
                    "reason": None,
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "latency": None,
                "lastChecked": _now_iso(),
                "reason": str(e),
            }

    async def ensure_model(self, model: str) -> bool:
        """Check if model exists, pull if not. Returns True if ready."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.host}/api/tags")
                resp.raise_for_status()
                models = [m["name"] for m in resp.json().get("models", [])]
                if any(model in m for m in models):
                    logger.info(f"Model {model} already available")
                    return True
        except Exception as e:
            logger.warning(f"Could not check models: {e}")
            return False

        # Model not found — attempt pull
        try:
            logger.info(f"Pulling model {model}...")
            async with httpx.AsyncClient(timeout=300) as client:
                async with client.stream(
                    "POST",
                    f"{self.host}/api/pull",
                    json={"name": model},
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                if "error" in chunk:
                                    logger.error(f"Pull failed: {chunk['error']}")
                                    return False
                            except json.JSONDecodeError:
                                pass
            logger.info(f"Model {model} pulled successfully")
            return True
        except Exception as e:
            logger.warning(f"Model pull failed (degraded mode): {e}")
            return False

    @staticmethod
    def _messages_to_prompt(messages: list[dict[str, str]]) -> str:
        """Convert chat messages to a single prompt for /api/generate."""
        parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                parts.append(f"System: {content}")
            elif role == "assistant":
                parts.append(f"Assistant: {content}")
            else:
                parts.append(content)
        return "\n".join(parts)
