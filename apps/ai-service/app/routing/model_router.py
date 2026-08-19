from __future__ import annotations

import logging

from ..config import Config
from ..models import IntentType
from ..providers.factory import ProviderFactory
from ..providers.health import ProviderHealthManager
from .model_registry import ModelRegistry
from .policy import get_policy

logger = logging.getLogger("ai_service.routing")


class ModelRouter:
    """Selects provider + model based on task, policy, and health."""

    def __init__(
        self,
        factory: ProviderFactory,
        health: ProviderHealthManager,
        config: Config,
        registry: ModelRegistry,
    ):
        self.factory = factory
        self.health = health
        self.config = config
        self.registry = registry
        # Cloud provider name is configured (default "cloud"), not hardcoded.
        self._cloud = config.cloud_provider_name

    def select(
        self,
        intent: IntentType | None = None,
        requested_model: str | None = None,
    ) -> tuple[str, str]:
        """Returns (provider_name, model_id)."""

        # If user requested a specific model, resolve + use it when healthy.
        # Try full ID first (e.g. "anthropic/claude-sonnet-4"), then split.
        entry = self.registry.get(requested_model) if requested_model else None
        if entry:
            provider_name = entry["provider"]
            if provider_name and self.health.is_healthy(provider_name):
                return provider_name, requested_model

        provider_req, model_id = ModelRegistry.split_provider_model(requested_model)
        if model_id:
            entry = self.registry.get(model_id)
            provider_name = provider_req or (entry["provider"] if entry else None)
            if provider_name and entry and self.health.is_healthy(provider_name):
                return provider_name, model_id

        # Fallback: if the model looks like a cloud ID (contains slash, not a
        # local model), try the cloud provider even if discovery hasn't loaded it.
        if requested_model and "/" in requested_model and self.health.is_healthy(self._cloud):
            return self._cloud, requested_model

        # Use intent-based policy.
        intent_name = intent.value if intent else "simple_chat"
        policy = get_policy(intent or IntentType.GENERAL)
        prefer = policy["prefer"]

        if prefer == "local" and self.health.is_healthy("ollama"):
            return "ollama", self.config.default_model
        if prefer == "cloud" and self._has_cloud():
            return self._cloud, self._cloud_model()

        # Fallback
        fallback = policy.get("fallback")
        if fallback == "cloud" and self._has_cloud():
            return self._cloud, self._cloud_model()
        if fallback == "local" and self.health.is_healthy("ollama"):
            return "ollama", self.config.default_model

        # Last resort: anything healthy
        if self.health.is_healthy("ollama"):
            return "ollama", self.config.default_model
        if self._has_cloud():
            return self._cloud, self._cloud_model()

        # Default even if unhealthy (will fail with a clear error)
        return self.config.ai_provider, self.config.default_model

    def _has_cloud(self) -> bool:
        return self.health.is_healthy(self._cloud)

    def _cloud_model(self) -> str:
        cloud = self.registry.cloud()
        if cloud:
            return cloud[0]["id"]
        return self.config.default_model
