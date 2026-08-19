from __future__ import annotations

import asyncio
from collections import defaultdict


class ConcurrencyLimiter:
    """Per-user semaphore to limit concurrent requests."""

    def __init__(self, max_per_user: int = 4, max_total: int = 20):
        self.max_per_user = max_per_user
        self._user_semaphores: dict[str, asyncio.Semaphore] = defaultdict(
            lambda: asyncio.Semaphore(max_per_user)
        )
        self._total_semaphore = asyncio.Semaphore(max_total)

    async def acquire(self, user_id: str) -> bool:
        sem = self._user_semaphores[user_id]
        if sem.locked():
            return False
        await sem.acquire()
        await self._total_semaphore.acquire()
        return True

    def release(self, user_id: str):
        sem = self._user_semaphores[user_id]
        try:
            sem.release()
        except ValueError:
            pass
        try:
            self._total_semaphore.release()
        except ValueError:
            pass
