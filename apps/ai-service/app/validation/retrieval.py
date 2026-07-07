from __future__ import annotations


class RetrievalValidator:
    """Validates retrieval confidence."""

    def __init__(self, min_confidence: float = 0.5):
        self.min_confidence = min_confidence

    def validate(self, documents: list) -> tuple[bool, str]:
        if not documents:
            return False, "No documents retrieved"
        scores = [getattr(d, "score", 0) for d in documents]
        avg = sum(scores) / len(scores) if scores else 0
        if avg < self.min_confidence:
            return False, f"Average confidence {avg:.2f} below threshold {self.min_confidence}"
        return True, "Retrieval valid"
