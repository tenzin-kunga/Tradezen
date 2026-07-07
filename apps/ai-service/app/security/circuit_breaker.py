from __future__ import annotations

import time
import logging

logger = logging.getLogger("ai_service.circuit")


class CircuitBreaker:
    """Failover on provider failure. Auto-recover after timeout."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failure_counts: dict[str, int] = {}
        self._open_until: dict[str, float] = {}
        self._state: dict[str, str] = {}  # "closed" | "open" | "half_open"

    def record_success(self, provider: str):
        self._failure_counts[provider] = 0
        self._state[provider] = "closed"

    def record_failure(self, provider: str):
        count = self._failure_counts.get(provider, 0) + 1
        self._failure_counts[provider] = count
        if count >= self.failure_threshold:
            self._state[provider] = "open"
            self._open_until[provider] = time.time() + self.recovery_timeout
            logger.warning(
                f"Circuit breaker OPEN for {provider} after {count} failures"
            )

    def is_available(self, provider: str) -> bool:
        state = self._state.get(provider, "closed")
        if state == "closed":
            return True
        if state == "open":
            if time.time() > self._open_until.get(provider, 0):
                self._state[provider] = "half_open"
                return True
            return False
        # half_open: allow one attempt
        return True
