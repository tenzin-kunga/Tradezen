from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field

logger = logging.getLogger("ai_service.retrieval.rrf")


@dataclass
class RRFConfig:
    """Configuration for Reciprocal Rank Fusion."""
    k: int = 60               # fusion constant (higher = less rank influence)
    vector_weight: float = 1.0
    keyword_weight: float = 1.0


class RRFFusionStage:
    """Merges ranked lists from vector and keyword search using RRF."""

    def __init__(self, config: RRFConfig | None = None):
        self.config = config or RRFConfig()

    def fuse(
        self,
        vector_results: list[dict],
        keyword_results: list[dict],
    ) -> list[dict]:
        """Fuse two ranked lists into a single RRF-ranked list."""
        start = time.monotonic()
        k = self.config.k

        # Score each document by its rank in each list
        scores: dict[str, float] = {}
        doc_map: dict[str, dict] = {}

        # Vector results
        for rank, doc in enumerate(vector_results):
            doc_id = doc["document_id"]
            rrf = self.config.vector_weight / (k + rank + 1)
            scores[doc_id] = scores.get(doc_id, 0) + rrf
            doc_map[doc_id] = doc

        # Keyword results
        for rank, doc in enumerate(keyword_results):
            doc_id = doc["document_id"]
            rrf = self.config.keyword_weight / (k + rank + 1)
            scores[doc_id] = scores.get(doc_id, 0) + rrf
            if doc_id not in doc_map:
                doc_map[doc_id] = doc

        # Sort by combined RRF score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        fused = []
        for doc_id in sorted_ids:
            doc = doc_map[doc_id].copy()
            doc["rrf_score"] = scores[doc_id]
            fused.append(doc)

        elapsed_ms = (time.monotonic() - start) * 1000
        logger.debug(f"RRF fusion: {len(vector_results)} vector + {len(keyword_results)} keyword → {len(fused)} fused ({elapsed_ms:.1f}ms)")
        return fused
