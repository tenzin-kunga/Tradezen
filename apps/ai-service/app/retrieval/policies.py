from __future__ import annotations


class RetrievalPolicy:
    """Intent → retrieval policy mapping."""

    def get_policy(self, intent: str) -> dict:
        return self.POLICIES.get(intent, self.POLICIES["general"])

    POLICIES = {
        "analytics": {
            "top_k": 5,
            "min_score": 0.6,
            "max_tokens": 2000,
            "source_types": ["trade"],
        },
        "coach": {
            "top_k": 10,
            "min_score": 0.5,
            "max_tokens": 4000,
            "source_types": ["trade", "journal", "memory"],
        },
        "research": {
            "top_k": 5,
            "min_score": 0.5,
            "max_tokens": 3000,
            "source_types": [],
        },
        "journal": {
            "top_k": 5,
            "min_score": 0.5,
            "max_tokens": 3000,
            "source_types": ["journal", "memory"],
        },
        "general": {
            "top_k": 3,
            "min_score": 0.7,
            "max_tokens": 2000,
            "source_types": [],
        },
    }
