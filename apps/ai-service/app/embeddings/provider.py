from __future__ import annotations

import logging
from typing import Protocol, runtime_checkable

logger = logging.getLogger("ai_service.embeddings")


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Protocol for embedding providers."""

    async def generate(self, texts: list[str]) -> list[list[float]]: ...

    def get_model_info(self) -> dict: ...

    async def health_check(self) -> bool: ...


class OpenAIEmbeddingProvider:
    """Embedding provider via OpenAI-compatible API."""

    def __init__(self, api_key: str, base_url: str, model: str = "text-embedding-3-small"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, texts: list[str]) -> list[list[float]]:
        import httpx

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"input": texts, "model": self.model},
            )
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data["data"]]

    def get_model_info(self) -> dict:
        return {"model": self.model, "provider": "openai"}

    async def health_check(self) -> bool:
        try:
            await self.generate(["test"])
            return True
        except Exception:
            return False


class OllamaEmbeddingProvider:
    """Embedding provider via Ollama local API."""

    def __init__(self, base_url: str, model: str = "nomic-embed-text"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, texts: list[str]) -> list[list[float]]:
        import httpx

        results = []
        async with httpx.AsyncClient(timeout=30) as client:
            for text in texts:
                resp = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.model, "prompt": text},
                )
                resp.raise_for_status()
                results.append(resp.json()["embedding"])
        return results

    def get_model_info(self) -> dict:
        return {"model": self.model, "provider": "ollama"}

    async def health_check(self) -> bool:
        try:
            await self.generate(["test"])
            return True
        except Exception:
            return False
