from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ExplainabilityInfo:
    stage: str
    detail: str
    latency_ms: float = 0.0


class SearchExplainer:
    """Provides explainability for retrieval results."""

    def explain(self, retrieval_result) -> list[dict]:
        entries = []
        entries.append({
            "stage": "embedding",
            "detail": f"Query embedded successfully",
        })
        entries.append({
            "stage": "candidate_retrieval",
            "detail": f"Found {retrieval_result.total_candidates} candidates",
        })
        entries.append({
            "stage": "filtering",
            "detail": f"Filtered to {retrieval_result.total_filtered} (min score threshold)",
        })
        entries.append({
            "stage": "budget_allocation",
            "detail": f"Final {len(retrieval_result.documents)} documents within token budget",
        })
        for doc in retrieval_result.documents:
            entries.append({
                "stage": "document",
                "detail": f"[{doc.source_type}] score={doc.score:.2f} {doc.title or doc.document_id}",
            })
        return entries
