from __future__ import annotations


class ToolFormatter:
    """Formats tool results for prompt insertion."""

    def format(self, results: list) -> str:
        if not results:
            return ""
        return "\n".join(f"- {getattr(r, 'content', str(r))}" for r in results)
