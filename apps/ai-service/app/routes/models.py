from __future__ import annotations

import logging

from fastapi import APIRouter, Request

logger = logging.getLogger("ai_service.models")

router = APIRouter(prefix="/v1", tags=["models"])


@router.get("/models")
async def list_models(request: Request):
    """All discovered models enriched with TradeZen metadata, grouped by provider."""
    container = request.app.state.container
    providers = container.provider_factory.all()

    # Refresh discovery cache and update the registry (concurrent).
    discovered = await container.discovery.discover_all(providers)
    for provider_id, models in discovered.items():
        container.model_registry.update_discovered(provider_id, models)

    # Default to the local model when Ollama is healthy; otherwise fall back to
    # the first available cloud model so the assistant works out of the box.
    health = await container.discovery.health_all(providers)
    default_model = container.config.default_model
    if health.get("ollama", {}).get("status") != "healthy":
        cloud_models = container.model_registry.models(container.config.cloud_provider_name)
        if cloud_models:
            default_model = cloud_models[0]["id"]

    result_providers = [
        {
            "id": pid,
            "displayName": pid.capitalize(),
            "models": container.model_registry.models(pid),
        }
        for pid in container.model_registry.providers()
    ]

    # If the caller forwarded a user-saved provider via headers, discover its
    # models and include them even if the provider isn't in the startup config.
    user_provider = request.headers.get("x-ai-provider")
    user_key = request.headers.get("x-ai-provider-key")
    user_base_url = request.headers.get("x-ai-provider-base-url")
    if user_provider and user_key:
        already_registered = user_provider in [p["id"] for p in result_providers]
        if not already_registered:
            try:
                from ..providers.cloud import CloudProvider
                base_url = user_base_url or container.config.provider_base_urls.get(user_provider)
                if base_url:
                    temp = CloudProvider(api_key=user_key, base_url=base_url)
                    user_models = await temp.list_models()
                    if user_models:
                        result_providers.append({
                            "id": user_provider,
                            "displayName": user_provider.capitalize(),
                            "models": user_models,
                        })
            except Exception as e:
                logger.warning(f"User provider discovery failed for {user_provider}: {e}")

    return {
        "defaultModel": default_model,
        "providers": result_providers,
    }


@router.get("/providers")
async def list_providers(request: Request):
    """Provider health status — separate concern from model listing."""
    container = request.app.state.container
    providers = container.provider_factory.all()
    health = await container.discovery.health_all(providers)
    return [
        {
            "id": name,
            "status": info.get("status", "unknown"),
            "latency": info.get("latency"),
            "lastChecked": info.get("lastChecked"),
            "reason": info.get("reason"),
        }
        for name, info in health.items()
    ]


@router.post("/models/refresh")
async def refresh_models(request: Request):
    """Invalidate discovery cache and re-discover from all providers."""
    container = request.app.state.container
    container.discovery.invalidate()
    providers = container.provider_factory.all()
    discovered = await container.discovery.discover_all(providers)
    for provider_id, models in discovered.items():
        container.model_registry.update_discovered(provider_id, models)
    return {"status": "refreshed", "providers": list(discovered.keys())}
