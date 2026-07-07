from __future__ import annotations

import time
from collections import defaultdict


class CostProtector:
    """Daily budget enforcement. Falls back to local model when exceeded."""

    def __init__(self, daily_budget: float = 20.0):
        self.daily_budget = daily_budget
        self._daily_cost: dict[str, float] = defaultdict(float)

    def check(self, estimated_cost: float) -> tuple[bool, str | None]:
        today = time.strftime("%Y-%m-%d")
        current = self._daily_cost[today]
        if current + estimated_cost > self.daily_budget:
            return False, "Daily cost budget exceeded"
        return True, None

    def record(self, cost: float):
        today = time.strftime("%Y-%m-%d")
        self._daily_cost[today] += cost

    def current_spend(self) -> float:
        today = time.strftime("%Y-%m-%d")
        return self._daily_cost[today]
