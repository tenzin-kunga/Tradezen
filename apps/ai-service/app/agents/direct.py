from __future__ import annotations

import logging

from .base import Agent
from ..execution.base import ExecutionResult, ExecutionStrategy

logger = logging.getLogger("ai_service.agents.direct")


class DirectAgent:
    """Handles simple intents via direct LLM call. Uses injected strategy."""

    name = "direct"

    def __init__(self, intent: str, strategy: ExecutionStrategy, tool=None):
        self._intent = intent
        self._strategy = strategy
        self._tool = tool

    def can_handle(self, intent_name: str) -> bool:
        return intent_name == self._intent or (self._intent == "general" and intent_name not in (
            "analytics", "coach", "journal", "research",
        ))

    async def execute(
        self,
        user_id: str,
        query: str,
        conversation: list[dict],
        session,
        strategy=None,
    ) -> ExecutionResult:
        strat = strategy or self._strategy
        return await strat.execute(user_id, query, conversation, session)
