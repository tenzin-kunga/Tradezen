from __future__ import annotations

import logging

from ..config import Config
from ..models import IntentType, ModelProfile
from ..providers.factory import ProviderFactory
from ..providers.health import ProviderHealthManager
from ..providers.profiles import get_profile, MODEL_PROFILES
from .policy import get_policy

logger = logging.getLogger("ai_service.routing")


class ModelRouter:
    """Selects provider + model based on task, policy, and health."""

    def __init__(
        self,
        factory: ProviderFactory,
        health: ProviderHealthManager,
        config: Config,
    ):
        self.factory = factory
        self.health = health
        self.config = config

    def select(
        self,
        intent: IntentType | None = None,
        requested_model: str | None = None,
    ) -> tuple[str, str]:
        """Returns (provider_name, model_name)."""

        # If user requested a specific model, use it
        if requested_model:
            profile = get_profile(requested_model)
            if profile:
                provider_name = profile.provider
                if self.health.is_healthy(provider_name):
                    return provider_name, requested_model

        # Use intent-based policy
        intent_name = intent.value if intent else "simple_chat"
        policy = get_policy(intent or IntentType.GENERAL)
        prefer = policy["prefer"]

        # Check if preferred provider is healthy
        if prefer == "local" and self.health.is_healthy("ollama"):
            return "ollama", self.config.default_model
        if prefer == "cloud" and self.health.is_healthy("openrouter"):
            return "openrouter", self._openrouter_model()

        # Fallback
        fallback = policy.get("fallback")
        if fallback == "cloud" and self.health.is_healthy("openrouter"):
            return "openrouter", self._openrouter_model()
        if fallback == "local" and self.health.is_healthy("ollama"):
            return "ollama", self.config.default_model

        # Last resort: try anything healthy
        if self.health.is_healthy("ollama"):
            return "ollama", self.config.default_model
        if self.health.is_healthy("openrouter"):
            return "openrouter", self._openrouter_model()

        # Default even if unhealthy (will fail with error)
        return self.config.ai_provider, self.config.default_model

    def _openrouter_model(self) -> str:
        """Find an OpenRouter model profile, fall back to config."""
        for name, profile in MODEL_PROFILES.items():
            if profile.provider == "openrouter":
                return name
        return self.config.default_model
