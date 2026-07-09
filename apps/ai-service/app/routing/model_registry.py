from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("ai_service.registry")


# TradeZen-specific metadata — NOT provider capabilities.
# Providers return raw discovery data; this layer adds application context
# (what TradeZen knows about a model) keyed by the clean model id.
ENRICHMENT: dict[str, dict[str, Any]] = {
    "qwen3:latest": {
        "displayName": "Qwen3 Local",
        "category": "reasoning",
        "supportsSql": True,
        "supportsRag": True,
        "supportsCoaching": True,
        "speed": "fast",
        "qualityScore": 75,
        "recommended": True,
    },
    "anthropic/claude-sonnet-4": {
        "displayName": "Claude Sonnet 4",
        "category": "reasoning",
        "supportsSql": True,
        "supportsRag": True,
        "supportsCoaching": True,
        "speed": "medium",
        "qualityScore": 95,
        "recommended": True,
    },
    "openai/gpt-4o": {
        "displayName": "GPT-4o",
        "category": "general",
        "supportsSql": True,
        "supportsRag": True,
        "supportsCoaching": True,
        "speed": "medium",
        "qualityScore": 90,
        "recommended": False,
    },
    "google/gemini-2.5-pro": {
        "displayName": "Gemini 2.5 Pro",
        "category": "reasoning",
        "supportsSql": True,
        "supportsRag": True,
        "supportsCoaching": False,
        "speed": "slow",
        "qualityScore": 92,
        "recommended": False,
    },
    "deepseek/deepseek-chat": {
        "displayName": "DeepSeek Chat",
        "category": "reasoning",
        "supportsSql": True,
        "supportsRag": True,
        "supportsCoaching": False,
        "speed": "fast",
        "qualityScore": 85,
        "recommended": False,
    },
}


class ModelRegistry:
    """Single source of truth for model metadata + enrichment.

    Providers push raw discovery results via ``update_discovered``; the registry
    enriches them with TradeZen-specific capabilities and exposes query methods.
    Routes never reach into private state — they use the public accessors.
    """

    def __init__(self) -> None:
        # provider -> list of raw discovered model dicts
        self._discovered: dict[str, list[dict]] = {}

    def update_discovered(self, provider_id: str, models: list[dict]) -> None:
        self._discovered[provider_id] = models

    def enrich(self, discovered: dict) -> dict:
        enrichment = ENRICHMENT.get(discovered["id"], {})
        return {**discovered, **enrichment}

    # ---- public accessors (routes use these, never private state) ----

    def providers(self) -> list[str]:
        return list(self._discovered.keys())

    def models(self, provider: str) -> list[dict]:
        return [self.enrich(m) for m in self._discovered.get(provider, [])]

    def all(self) -> list[dict]:
        return [
            self.enrich(m)
            for models in self._discovered.values()
            for m in models
        ]

    def get(self, model_id: str) -> dict | None:
        for models in self._discovered.values():
            for m in models:
                if m["id"] == model_id:
                    return self.enrich(m)
        return None

    def recommended(self) -> list[dict]:
        return [m for m in self.all() if m.get("recommended")]

    def by_category(self, category: str) -> list[dict]:
        return [m for m in self.all() if m.get("category") == category]

    def local(self) -> list[dict]:
        return self.models("ollama")

    def cloud(self) -> list[dict]:
        return [m for m in self.all() if m.get("provider") != "ollama"]

    def best_for_sql(self) -> list[dict]:
        return [m for m in self.all() if m.get("supportsSql")]

    def best_for_coaching(self) -> list[dict]:
        return [m for m in self.all() if m.get("supportsCoaching")]

    @staticmethod
    def split_provider_model(requested_model: str | None) -> tuple[str | None, str | None]:
        """Split a possibly-prefixed model id into (provider, model_id).

        ``openrouter/anthropic/claude-sonnet-4`` -> ('openrouter', 'anthropic/claude-sonnet-4').
        ``qwen3:latest`` -> (None, 'qwen3:latest').
        """
        if not requested_model:
            return None, None
        if "/" in requested_model:
            prefix, rest = requested_model.split("/", 1)
            return prefix, rest
        return None, requested_model
