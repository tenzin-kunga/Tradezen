from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import Config
from .container import Container
from .models.session import AISession
from .routes.health import router as health_router
from .routes.openai import router as openai_router
from .routes.tradezen import router as tradezen_router
from .routes.ingestion import router as ingestion_router
from .routes.models import router as models_router
from .routes import traces as traces_route

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_service")


def create_app() -> FastAPI:
    config = Config.from_env()
    container = Container(config)

    app = FastAPI(
        title="TradeZen AI Service",
        version="0.1.0",
        description="AI service for TradeZen trading platform",
    )

    # Store container
    app.state.container = container

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security + observability middleware
    @app.middleware("http")
    async def security_and_obs_middleware(request: Request, call_next):
        # Skip security for health
        if request.url.path.startswith("/health"):
            return await call_next(request)

        start = time.time()
        ip = request.client.host if request.client else "unknown"

        # Read body for POST
        body = None
        if request.method == "POST":
            try:
                body = await request.json()
            except Exception:
                body = {}

        # Auth
        user = await container.auth.verify(dict(request.headers), body)
        if not user:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})

        # Rate limit
        user_id = user.get("id", "unknown")
        endpoint = "chat"
        if "/research" in request.url.path:
            endpoint = "research"
        elif "/coach" in request.url.path:
            endpoint = "coaching"

        limit = container.rate_limits.get(endpoint, container.rate_limits["chat"])
        allowed, retry_after = await container.rate_limiter.check(
            f"{user_id}:{endpoint}", limit
        )
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limited", "retry_after": retry_after},
            )

        # Validation (for POST with body)
        if body and request.method == "POST":
            from .models.chat import ChatRequest, Message

            try:
                messages = [Message(**m) for m in body.get("messages", [])]
                chat_req = ChatRequest(user_id=user_id, messages=messages)
                ok, error = container.validation_pipeline.validate(chat_req)
                if not ok:
                    return JSONResponse(status_code=400, content={"error": error})
            except Exception:
                pass  # Non-chat endpoint

        # Concurrency
        acquired = await container.concurrency.acquire(user_id)
        if not acquired:
            return JSONResponse(
                status_code=429, content={"error": "Too many concurrent requests"}
            )

        # Create session
        session = AISession(
            user_id=user_id,
            cache=container.cache,
            events=container.events,
            telemetry=container.telemetry,
            feature_flags=container.feature_flags,
        )
        request.state.session = session

        # Store provider context from headers (forwarded by NestJS)
        provider = request.headers.get("x-ai-provider")
        provider_key = request.headers.get("x-ai-provider-key")
        provider_base_url = request.headers.get("x-ai-provider-base-url")
        if provider or provider_key:
            request.state.provider_context = {
                "provider": provider,
                "api_key": provider_key,
                "base_url": provider_base_url,
            }

        try:
            response = await call_next(request)
            return response
        finally:
            container.concurrency.release(user_id)
            elapsed = (time.time() - start) * 1000
            logger.info(
                f"[{request.url.path}] {elapsed:.0f}ms user={user_id} ip={ip}"
            )

    # Routes
    app.include_router(health_router)
    app.include_router(tradezen_router)
    app.include_router(openai_router)
    app.include_router(models_router)
    app.include_router(ingestion_router)
    traces_route.init(container.traces_store)
    app.include_router(traces_route.router)

    @app.on_event("startup")
    async def startup():
        await container.initialize()
        logger.info("TradeZen AI Service started")

    @app.on_event("shutdown")
    async def shutdown():
        await container.close()
        logger.info("TradeZen AI Service stopped")

    return app


app = create_app()
