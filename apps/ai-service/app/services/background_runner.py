from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable, Coroutine

logger = logging.getLogger("ai_service.background")


class BackgroundTaskRunner:
    """Runs post-inference tasks (memory extraction, analytics, telemetry) without blocking."""

    def __init__(self):
        self._tasks: list[asyncio.Task] = []

    def run(self, coro: Coroutine, name: str = "") -> None:
        """Fire-and-forget a coroutine. Logs failures, doesn't crash the request."""
        task = asyncio.create_task(self._wrap(coro, name))
        self._tasks.append(task)
        task.add_done_callback(lambda t: self._tasks.discard(t))

    async def _wrap(self, coro: Coroutine, name: str) -> None:
        try:
            await coro
        except Exception as e:
            logger.warning(f"Background task {name or 'unnamed'} failed: {e}")

    def cancel_all(self) -> None:
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
