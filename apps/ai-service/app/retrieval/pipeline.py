from __future__ import annotations

import asyncio
import time
import logging
from dataclasses import dataclass, field

from ..models.common import RetrievedDocument
from .stages.embedding import QueryEmbeddingStage
from .stages.vector import VectorSearchStage
from .stages.keyword import KeywordSearchStage
from .stages.rrf import RRFFusionStage, RRFConfig
from .stages.filtering import FilteringStage
from .stages.budget import BudgetAllocationStage

logger = logging.getLogger("ai_service.retrieval")


@dataclass
class RetrievalResult:
    documents: list[RetrievedDocument]
    total_candidates: int = 0
    total_filtered: int = 0
    latency_ms: float = 0.0
    latency_breakdown: dict = field(default_factory=dict)


@dataclass
class RetrievalOptions:
    top_k: int = 10
    min_score: float = 0.5
    max_tokens: int = 4000
    source_types: list[str] | None = None
    use_hybrid: bool = True  # False = vector-only (baseline)


class RetrievalPipeline:
    """Orchestrates retrieval stages. Supports vector-only and hybrid modes."""

    def __init__(
        self,
        embedding_stage: QueryEmbeddingStage,
        vector_stage: VectorSearchStage,
        keyword_stage: KeywordSearchStage | None = None,
        rrf_stage: RRFFusionStage | None = None,
        filtering_stage: FilteringStage | None = None,
        budget_stage: BudgetAllocationStage | None = None,
    ):
        self.embedding = embedding_stage
        self.vector = vector_stage
        self.keyword = keyword_stage
        self.rrf = rrf_stage or RRFFusionStage()
        self.filtering = filtering_stage
        self.budget = budget_stage

    async def retrieve(
        self, user_id: str, query: str, options: RetrievalOptions | None = None,
    ) -> RetrievalResult:
        return await self._run(user_id, query, options)

    async def retrieve_trades(
        self, user_id: str, query: str, top_k: int = 5,
    ) -> RetrievalResult:
        opts = RetrievalOptions(top_k=top_k, source_types=["trade"])
        return await self._run(user_id, query, opts)

    async def retrieve_journals(
        self, user_id: str, query: str, top_k: int = 5,
    ) -> RetrievalResult:
        opts = RetrievalOptions(top_k=top_k, source_types=["journal"])
        return await self._run(user_id, query, opts)

    async def retrieve_memories(
        self, user_id: str, query: str, top_k: int = 5,
    ) -> RetrievalResult:
        opts = RetrievalOptions(top_k=top_k, source_types=["memory"])
        return await self._run(user_id, query, opts)

    async def _run(
        self, user_id: str, query: str, options: RetrievalOptions | None = None,
    ) -> RetrievalResult:
        opts = options or RetrievalOptions()
        start = time.monotonic()
        breakdown: dict[str, float] = {}

        # Stage 1: Embed query
        t = time.monotonic()
        query_embedding = await self.embedding.embed(query)
        breakdown["embed"] = (time.monotonic() - t) * 1000

        # Stage 2: Search — hybrid (parallel vector + keyword → RRF) or vector-only
        if opts.use_hybrid and self.keyword:
            t = time.monotonic()
            vector_results, keyword_results = await asyncio.gather(
                self.vector.search(user_id, query_embedding, opts.top_k * 2, opts.source_types),
                self.keyword.search(user_id, query, opts.top_k * 2, opts.source_types),
                return_exceptions=True,
            )
            breakdown["vector"] = (time.monotonic() - t) * 1000

            # Handle exceptions from either search
            if isinstance(vector_results, Exception):
                vector_results = []
                logger.warning(f"Vector search failed: {vector_results}")
            if isinstance(keyword_results, Exception):
                keyword_results = []
                logger.warning(f"Keyword search failed: {keyword_results}")

            # Stage 3: RRF fusion
            t = time.monotonic()
            candidates = self.rrf.fuse(vector_results, keyword_results)
            breakdown["rrf"] = (time.monotonic() - t) * 1000
        else:
            t = time.monotonic()
            candidates = await self.vector.search(
                user_id, query_embedding, opts.top_k, opts.source_types,
            )
            breakdown["vector"] = (time.monotonic() - t) * 1000

        # Stage 4: Filter (score threshold)
        t = time.monotonic()
        if self.filtering:
            filtered = self.filtering.filter(candidates, opts.min_score)
        else:
            filtered = [c for c in candidates if c.get("score", 0) >= opts.min_score]
        breakdown["filter"] = (time.monotonic() - t) * 1000

        # Stage 5: Budget allocation
        t = time.monotonic()
        if self.budget:
            allocated = self.budget.allocate(filtered, opts.max_tokens)
        else:
            allocated = filtered
        breakdown["budget"] = (time.monotonic() - t) * 1000

        elapsed_ms = (time.monotonic() - start) * 1000

        result = RetrievalResult(
            documents=[
                RetrievedDocument(
                    document_id=c["document_id"],
                    source_type=c["source_type"],
                    source_id=c.get("source_id"),
                    content=c.get("content", ""),
                    title=c.get("metadata", {}).get("title"),
                    score=c.get("rrf_score") or c.get("score", 0),
                    metadata=c.get("metadata"),
                )
                for c in allocated
            ],
            total_candidates=len(candidates),
            total_filtered=len(filtered),
            latency_ms=elapsed_ms,
            latency_breakdown=breakdown,
        )

        mode = "hybrid" if (opts.use_hybrid and self.keyword) else "vector"
        logger.info(
            f"Retrieval [{mode}]: {len(candidates)} candidates → {len(filtered)} filtered → {len(allocated)} final ({elapsed_ms:.0f}ms)"
        )
        return result
