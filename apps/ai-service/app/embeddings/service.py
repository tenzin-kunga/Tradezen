from __future__ import annotations

import logging
import time

from .provider import EmbeddingProvider

logger = logging.getLogger("ai_service.embeddings")


class EmbeddingService:
    """Centralized embedding generation. All embedding happens here."""

    def __init__(self, provider: EmbeddingProvider):
        self.provider = provider
        self.model_info = provider.get_model_info()

    async def generate(self, texts: list[str]) -> list[list[float]]:
        start = time.monotonic()
        embeddings = await self.provider.generate(texts)
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.info(f"Generated {len(texts)} embeddings in {elapsed_ms:.0f}ms")
        return embeddings

    async def generate_single(self, text: str) -> list[float]:
        results = await self.generate([text])
        return results[0]

    def get_model_info(self) -> dict:
        return self.model_info

    async def health_check(self) -> bool:
        return await self.provider.health_check()
