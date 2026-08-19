from __future__ import annotations


class ContextBudgetManager:
    """Manages token budget allocation across prompt sections."""

    def __init__(self, max_tokens: int = 8000):
        self.max_tokens = max_tokens

    def allocate(self, sections: dict[str, int]) -> dict[str, int]:
        total = sum(sections.values())
        if total <= self.max_tokens:
            return sections.copy()
        scale = self.max_tokens / total
        return {k: max(int(v * scale), 100) for k, v in sections.items()}

    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4
