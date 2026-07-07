from __future__ import annotations


class MemoryFormatter:
    """Formats memories for prompt insertion."""

    def format(self, memories: list) -> str:
        if not memories:
            return ""
        return "\n".join(f"- {getattr(m, 'content', str(m))}" for m in memories)
