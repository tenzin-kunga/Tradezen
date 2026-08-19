from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable

logger = logging.getLogger("ai_service.events")


class EventBus:
    """In-process event bus. Swap to Redis/BullMQ later."""

    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = {}

    def subscribe(self, event: str, handler: Callable):
        self._subscribers.setdefault(event, []).append(handler)

    async def publish(self, event: str, data: dict[str, Any]):
        handlers = self._subscribers.get(event, [])
        if not handlers:
            return

        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception:
                logger.exception(f"Event handler error for {event}")
