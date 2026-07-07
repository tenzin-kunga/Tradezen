from __future__ import annotations


class FilteringStage:
    """Stage 3: Filter candidates by score threshold and deduplicate."""

    def filter(self, candidates: list[dict], min_score: float = 0.5) -> list[dict]:
        seen = set()
        filtered = []
        for c in candidates:
            doc_id = c.get("document_id", "")
            if doc_id in seen:
                continue
            if c.get("score", 0) < min_score:
                continue
            seen.add(doc_id)
            filtered.append(c)
        return filtered
