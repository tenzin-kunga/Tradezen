from __future__ import annotations

import asyncio
import logging
import time

logger = logging.getLogger("ai_service.discovery")


class DiscoveryCache:
    """Caches provider model/health discovery with concurrent refresh.

    Providers are queried in parallel (asyncio.gather) so adding more providers
    does not increase startup time linearly. A background task refreshes stale
    entries on a fixed interval; callers can also invalidate manually.
    """

    def __init__(self, ttl_seconds: int = 600):
        self._ttl = ttl_seconds
        self._models: dict[str, tuple[float, list[dict]]] = {}
        self._health: dict[str, dict] = {}
        self._task: asyncio.Task | None = None

    async def get_models(self, provider_name: str, provider) -> list[dict]:
        now = time.time()
        if provider_name in self._models:
            cached_at, models = self._models[provider_name]
            if now - cached_at < self._ttl:
                return models
        try:
            models = await provider.list_models()
            self._models[provider_name] = (now, models)
            return models
        except Exception as e:
            logger.warning(f"Discovery failed for {provider_name}: {e}")
            if provider_name in self._models:
                return self._models[provider_name][1]  # stale cache beats empty
            return []

    async def get_health(self, provider_name: str, provider) -> dict:
        now = time.time()
        cached = self._health.get(provider_name)
        if cached and now - cached.get("_checked_at", 0) < self._ttl:
            return cached
        try:
            health = await provider.health()
        except Exception as e:
            health = {
                "status": "unhealthy",
                "latency": None,
                "lastChecked": None,
                "reason": str(e),
            }
        health["_checked_at"] = now
        self._health[provider_name] = health
        return health

    async def discover_all(self, providers: dict[str, object]) -> dict[str, list[dict]]:
        """Fetch models from every provider concurrently."""
        results = await asyncio.gather(
            *[self.get_models(name, prov) for name, prov in providers.items()],
            return_exceptions=True,
        )
        out: dict[str, list[dict]] = {}
        for (name, _), res in zip(providers.items(), results):
            if isinstance(res, Exception):
                logger.warning(f"Discovery failed for {name}: {res}")
                out[name] = self._models.get(name, (0, []))[1]
            else:
                out[name] = res
        return out

    async def health_all(self, providers: dict[str, object]) -> dict[str, dict]:
        results = await asyncio.gather(
            *[self.get_health(name, prov) for name, prov in providers.items()],
            return_exceptions=True,
        )
        out: dict[str, dict] = {}
        for (name, _), res in zip(providers.items(), results):
            out[name] = res if isinstance(res, dict) else {"status": "unhealthy"}
        return out

    def invalidate(self, provider_name: str | None = None) -> None:
        if provider_name:
            self._models.pop(provider_name, None)
            self._health.pop(provider_name, None)
        else:
            self._models.clear()
            self._health.clear()

    async def start_background_refresh(
        self, providers: dict[str, object], interval: int = 600
    ) -> None:
        async def _loop() -> None:
            while True:
                await asyncio.sleep(interval)
                try:
                    await self.discover_all(providers)
                    await self.health_all(providers)
                except Exception as e:  # pragma: no cover - defensive
                    logger.warning(f"Background discovery refresh failed: {e}")

        self._task = asyncio.create_task(_loop())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None
