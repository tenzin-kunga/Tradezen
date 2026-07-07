from __future__ import annotations


class DocumentFormatter:
    """Formats retrieved documents for prompt insertion."""

    def format(self, docs: list) -> str:
        if not docs:
            return ""
        lines = []
        for i, doc in enumerate(docs, 1):
            citation = getattr(doc, "citation", None) or getattr(doc, "title", None) or getattr(doc, "document_id", f"doc_{i}")
            content = getattr(doc, "content", "")
            lines.append(f"[{i}] ({citation}) {content}")
        return "\n\n".join(lines)
