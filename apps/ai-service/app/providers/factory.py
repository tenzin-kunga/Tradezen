from __future__ import annotations

from ..config import Config
from .cloud import CloudProvider
from .ollama import OllamaProvider


class ProviderFactory:
    """Creates and caches provider instances."""

    def __init__(self, config: Config):
        self._config = config
        self._providers: dict[str, OllamaProvider | CloudProvider] = {}

    def get(self, name: str | None = None) -> OllamaProvider | CloudProvider:
        provider_name = name or self._config.ai_provider
        if provider_name in self._providers:
            return self._providers[provider_name]

        if provider_name == "ollama":
            provider = OllamaProvider(
                host=self._config.ollama_host,
                timeout=self._config.ollama_timeout,
            )
        elif provider_name == self._config.cloud_provider_name:
            provider = CloudProvider(
                api_key=self._config.cloud_api_key,
                base_url=self._config.cloud_base_url,
                timeout=self._config.cloud_timeout,
            )
        else:
            raise ValueError(f"Unknown provider: {provider_name}")

        self._providers[provider_name] = provider
        return provider

    def all(self) -> dict[str, OllamaProvider | CloudProvider]:
        """Instantiate all configured providers."""
        providers = {}
        if self._config.ollama_host:
            providers["ollama"] = self.get("ollama")
        # Register cloud provider only if an API key is configured.
        # Per-request keys (from user settings) bypass this — the provider
        # is created on-the-fly in the route layer.
        if self._config.cloud_api_key:
            providers[self._config.cloud_provider_name] = self.get(self._config.cloud_provider_name)
        return providers
