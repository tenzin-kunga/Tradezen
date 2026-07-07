from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Protocol


@dataclass
class RateLimitConfig:
    requests: int
    window_seconds: int


def parse_rate_limit(rate_str: str) -> RateLimitConfig:
    """Parse '60/min' or '20/hour' into RateLimitConfig."""
    count, period = rate_str.split("/")
    count = int(count)
    match period:
        case "sec" | "second" | "seconds":
            window = 1
        case "min" | "minute" | "minutes":
            window = 60
        case "hour" | "hours":
            window = 3600
        case "day" | "days":
            window = 86400
        case _:
            window = 60
    return RateLimitConfig(requests=count, window_seconds=window)


class RateLimiter(Protocol):
    async def check(self, key: str, limit: RateLimitConfig) -> tuple[bool, float | None]: ...


class MemoryRateLimiter:
    """In-memory sliding window rate limiter."""

    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    async def check(self, key: str, limit: RateLimitConfig) -> tuple[bool, float | None]:
        now = time.time()
        cutoff = now - limit.window_seconds
        self._windows[key] = [t for t in self._windows[key] if t > cutoff]

        if len(self._windows[key]) >= limit.requests:
            oldest = self._windows[key][0]
            retry_after = limit.window_seconds - (now - oldest)
            return False, max(retry_after, 0)

        self._windows[key].append(now)
        return True, None
