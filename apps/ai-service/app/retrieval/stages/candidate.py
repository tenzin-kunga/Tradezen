from __future__ import annotations

import asyncio

from ...repositories.vector_repository import VectorRepository
from ...repositories.trade_repository import TradeRepository
from ...repositories.journal_repository import JournalRepository
from ...repositories.memory_repository import MemoryRepository


class CandidateRetrievalStage:
    """Stage 2: Parallel candidate retrieval across all sources."""

    def __init__(
        self,
        vector_repo: VectorRepository,
        trade_repo: TradeRepository,
        journal_repo: JournalRepository,
        memory_repo: MemoryRepository,
    ):
        self.vector_repo = vector_repo
        self.trade_repo = trade_repo
        self.journal_repo = journal_repo
        self.memory_repo = memory_repo

    async def retrieve(
        self,
        user_id: str,
        query_embedding: list[float],
        top_k: int = 10,
        source_types: list[str] | None = None,
    ) -> list[dict]:
        sources = source_types or ["trade", "journal", "memory"]
        tasks = []

        tasks.append(
            self.vector_repo.search(
                user_id, query_embedding, limit=top_k, min_score=0.5, source_types=sources,
            )
        )

        results = await asyncio.gather(*tasks, return_exceptions=True)
        candidates = []
        for r in results:
            if isinstance(r, Exception):
                continue
            candidates.extend(r)
        candidates.sort(key=lambda x: x.get("score", 0), reverse=True)
        return candidates[:top_k]
