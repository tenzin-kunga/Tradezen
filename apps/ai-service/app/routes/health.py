from __future__ import annotations

import time

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request):
    container = request.app.state.container
    provider_status = container.provider_health.get_status()

    # Database health
    db_status = "not_configured"
    if container.db:
        try:
            ok = await container.db.health_check()
            db_status = "healthy" if ok else "unhealthy"
        except Exception:
            db_status = "unhealthy"

    return {
        "status": "ok",
        "timestamp": time.time(),
        "providers": provider_status,
        "database": db_status,
        "features": container.feature_flags.all_enabled(),
    }


@router.get("/providers/health")
async def providers_health(request: Request):
    container = request.app.state.container
    return container.provider_health.get_status()
