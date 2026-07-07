from __future__ import annotations

import time
import logging

from ...repositories.vector_repository import VectorRepository

logger = logging.getLogger("ai_service.retrieval.vector")


class VectorSearchStage:
    """Embedding similarity search via pgvector."""

    def __init__(self, vector_repo: VectorRepository):
        self.vector_repo = vector_repo

    async def search(
        self,
        user_id: str,
        query_embedding: list[float],
        top_k: int = 10,
        source_types: list[str] | None = None,
        min_score: float = 0.5,
    ) -> list[dict]:
        start = time.monotonic()
        sources = source_types or ["trade", "journal", "memory"]

        results = await self.vector_repo.search(
            user_id, query_embedding, limit=top_k, min_score=min_score, source_types=sources,
        )

        elapsed_ms = (time.monotonic() - start) * 1000
        logger.debug(f"Vector search: {len(results)} results ({elapsed_ms:.0f}ms)")
        return results
