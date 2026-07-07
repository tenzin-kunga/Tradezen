from __future__ import annotations

from typing import Protocol

from ..execution.base import ExecutionResult


class Agent(Protocol):
    """Agent protocol. Each agent handles a specific intent."""

    name: str

    def can_handle(self, intent_name: str) -> bool: ...

    async def execute(
        self,
        user_id: str,
        query: str,
        conversation: list[dict],
        session,
        strategy,  # injected by execution planner
    ) -> ExecutionResult: ...
