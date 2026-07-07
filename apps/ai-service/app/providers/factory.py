from __future__ import annotations

from ..config import Config
from .ollama import OllamaProvider
from .openrouter import OpenRouterProvider


class ProviderFactory:
    """Creates and caches provider instances."""

    def __init__(self, config: Config):
        self._config = config
        self._providers: dict[str, OllamaProvider | OpenRouterProvider] = {}

    def get(self, name: str | None = None) -> OllamaProvider | OpenRouterProvider:
        provider_name = name or self._config.ai_provider
        if provider_name in self._providers:
            return self._providers[provider_name]

        if provider_name == "ollama":
            provider = OllamaProvider(
                host=self._config.ollama_host,
                timeout=self._config.ollama_timeout,
            )
        elif provider_name == "openrouter":
            provider = OpenRouterProvider(
                api_key=self._config.openrouter_api_key,
                base_url=self._config.openrouter_base_url,
                timeout=self._config.openrouter_timeout,
            )
        else:
            raise ValueError(f"Unknown provider: {provider_name}")

        self._providers[provider_name] = provider
        return provider

    def all(self) -> dict[str, OllamaProvider | OpenRouterProvider]:
        """Instantiate all configured providers."""
        providers = {}
        if self._config.ollama_host:
            providers["ollama"] = self.get("ollama")
        if self._config.openrouter_api_key:
            providers["openrouter"] = self.get("openrouter")
        return providers
