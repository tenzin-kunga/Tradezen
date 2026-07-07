from __future__ import annotations

from ..models.intent import IntentType


MODEL_POLICIES: dict[str, dict] = {
    "simple_chat": {"prefer": "local", "fallback": "cloud"},
    "large_context": {"prefer": "cloud", "fallback": "local"},
    "research": {"prefer": "cloud", "fallback": "local"},
    "coaching": {"prefer": "local", "fallback": "cloud"},
    "analytics": {"prefer": "local", "fallback": "cloud"},
    "journal": {"prefer": "local", "fallback": "cloud"},
}


def get_policy(intent: IntentType) -> dict:
    return MODEL_POLICIES.get(intent.value, {"prefer": "local", "fallback": "cloud"})
