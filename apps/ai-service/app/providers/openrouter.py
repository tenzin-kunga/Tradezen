from __future__ import annotations

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


class OpenRouterProvider:
    """OpenRouter cloud model provider."""

    name = "openrouter"

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://openrouter.ai/api/v1",
        timeout: int = 30,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.capabilities = ProviderCapabilities(
            supports_streaming=True,
            supports_tools=True,
            supports_reasoning=True,
            supports_json=True,
            supports_vision=False,
            supports_embeddings=False,
            max_context=131072,
        )

    def _headers(self, api_key: str | None = None) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key or self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "TradeZen",
        }

    @staticmethod
    def _normalize_model(model: str | None) -> str:
        # Strip our internal "openrouter/" namespace prefix before hitting the API.
        if not model:
            return "qwen/qwen3-next-80b-a3b-instruct:free"
        return model[len("openrouter/"):] if model.startswith("openrouter/") else model

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int | None = None,
        stream: bool = False,
        api_key: str | None = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": self._normalize_model(model),
            "messages": messages,
            "stream": False,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(api_key),
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]
            return {
                "content": choice["message"]["content"],
                "model": data.get("model", ""),
                "usage": data.get("usage", {}),
            }

    async def stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int | None = None,
        api_key: str | None = None,
    ) -> AsyncIterator[str]:
        body: dict[str, Any] = {
            "model": self._normalize_model(model),
            "messages": messages,
            "stream": True,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self._headers(api_key),
                json=body,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        chunk = json.loads(payload)
                        token = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                        if token:
                            yield token
                    except json.JSONDecodeError:
                        continue

    async def raw_chat(self, body: dict[str, Any], api_key: str | None = None) -> dict[str, Any]:
        """Transparent OpenAI-compatible passthrough (tools/tool_calls).

        The caller (NestJS AgentRuntime) owns the tool loop, so we forward the
        full request body verbatim and return the raw provider response.
        """
        body = {**body, "model": self._normalize_model(body.get("model"))}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(api_key),
                json=body,
            )
            resp.raise_for_status()
            return resp.json()

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[dict]:
        """Raw discovery — forward provider metadata, registry enriches the rest."""
        if not self.api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json().get("data", [])
                return [
                    {
                        "id": m["id"],
                        "provider": "openrouter",
                        "contextWindow": m.get("context_length"),
                        "raw": {
                            "name": m.get("name"),
                            "modality": m.get("architecture", {}).get("modality"),
                            "parameters": m.get("supported_parameters", []),
                        },
                    }
                    for m in data
                    if m.get("id")
                ]
        except Exception as e:
            logger.warning(f"OpenRouter model discovery failed: {e}")
            return []

    async def health(self) -> dict:
        if not self.api_key:
            return {
                "status": "unhealthy",
                "latency": None,
                "lastChecked": _now_iso(),
                "reason": "Missing API key",
            }
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{self.base_url}/models",
                    headers=self._headers(),
                )
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
