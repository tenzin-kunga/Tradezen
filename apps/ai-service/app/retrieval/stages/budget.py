from __future__ import annotations


class BudgetAllocationStage:
    """Stage 4: Allocate token budget across retrieved documents."""

    def allocate(self, candidates: list[dict], max_tokens: int = 4000) -> list[dict]:
        total = 0
        result = []
        for c in candidates:
            est_tokens = len(c.get("content", "")) // 4
            if total + est_tokens > max_tokens:
                break
            total += est_tokens
            result.append(c)
        return result
