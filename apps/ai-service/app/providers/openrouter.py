from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

import httpx

from ..models.provider import ProviderCapabilities

logger = logging.getLogger("ai_service.providers")


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

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "TradeZen",
        }

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int | None = None,
        stream: bool = False,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": model or "qwen/qwen3-next-80b-a3b-instruct:free",
            "messages": messages,
            "stream": False,
            "temperature": temperature,
        }
        if max_tokens:
            body["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
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
    ) -> AsyncIterator[str]:
        body: dict[str, Any] = {
            "model": model or "qwen/qwen3-next-80b-a3b-instruct:free",
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
                headers=self._headers(),
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
