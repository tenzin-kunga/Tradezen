from __future__ import annotations

import asyncio
import random
import logging

logger = logging.getLogger("ai_service.retry")


class RetryPolicy:
    """Exponential backoff with jitter."""

    def __init__(self, max_retries: int = 2, base_delay: float = 0.5, max_delay: float = 5.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    async def execute(self, fn, fallback_fn=None):
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                return await fn()
            except Exception as e:
                last_error = e
                if attempt < self.max_retries:
                    delay = min(self.base_delay * (2**attempt), self.max_delay)
                    delay *= random.uniform(0.5, 1.5)
                    logger.debug(f"Retry {attempt + 1}/{self.max_retries} in {delay:.2f}s")
                    await asyncio.sleep(delay)

        if fallback_fn:
            return await fallback_fn()
        raise last_error
