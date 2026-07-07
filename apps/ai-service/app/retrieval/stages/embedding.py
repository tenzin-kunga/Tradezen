from __future__ import annotations

from ...embeddings.service import EmbeddingService


class QueryEmbeddingStage:
    """Stage 1: Embed the query."""

    def __init__(self, embedding_service: EmbeddingService):
        self.embedding_service = embedding_service

    async def embed(self, query: str) -> list[float]:
        return await self.embedding_service.generate_single(query)
