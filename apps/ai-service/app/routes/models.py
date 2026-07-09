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

    return {
        "defaultModel": container.config.default_model,
        "providers": [
            {
                "id": pid,
                "displayName": pid.capitalize(),
                "models": container.model_registry.models(pid),
            }
            for pid in container.model_registry.providers()
        ],
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
