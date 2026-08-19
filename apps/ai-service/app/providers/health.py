from __future__ import annotations

import asyncio
import logging
import time

logger = logging.getLogger("ai_service.health")


class ProviderHealthManager:
    """Background pings providers. ModelRouter uses health status."""

    def __init__(self):
        self._health: dict[str, bool] = {}
        self._last_check: dict[str, float] = {}
        self._running = False

    def set(self, provider_name: str, healthy: bool):
        self._health[provider_name] = healthy
        self._last_check[provider_name] = time.time()

    def is_healthy(self, provider_name: str) -> bool:
        return self._health.get(provider_name, True)

    async def check_all(self, providers: dict) -> dict[str, bool]:
        results = {}
        for name, provider in providers.items():
            try:
                healthy = await asyncio.wait_for(provider.health_check(), timeout=5)
                results[name] = healthy
                self._health[name] = healthy
                self._last_check[name] = time.time()
                logger.info(f"Provider {name}: {'healthy' if healthy else 'unhealthy'}")
            except Exception as e:
                results[name] = False
                self._health[name] = False
                logger.warning(f"Provider {name} health check failed: {e}")
        return results

    async def start_background_checks(self, providers: dict, interval: int = 30):
        """Run health checks every `interval` seconds."""
        self._running = True
        while self._running:
            await self.check_all(providers)
            await asyncio.sleep(interval)

    def stop(self):
        self._running = False

    def get_status(self) -> dict[str, dict]:
        return {
            name: {
                "healthy": self._health.get(name, None),
                "last_check": self._last_check.get(name),
            }
            for name in set(list(self._health.keys()))
        }
