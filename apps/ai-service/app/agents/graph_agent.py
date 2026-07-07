from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("ai_service.agents.graphs")


class CoachAgent:
    """Coaching agent. Uses LangGraph workflow for multi-stage analysis."""

    name = "coach"

    def __init__(self, default_strategy=None, graph=None):
        self._default_strategy = default_strategy
        self._graph = graph  # compiled LangGraph, or None

    def can_handle(self, intent_name: str) -> bool:
        return intent_name == "coach"

    async def execute(self, user_id, query, conversation, session, strategy=None):
        if self._graph:
            from .graphs.states import CoachState
            state = CoachState(
                user_id=user_id,
                request_id=getattr(session, "request_id", ""),
                trace_id=getattr(session, "trace_id", ""),
                query=query,
            )
            try:
                result = await self._graph.ainvoke(state)
                from ..execution.base import ExecutionResult
                return ExecutionResult(
                    content=result.get("coaching_output", "") if isinstance(result, dict) else getattr(result, "coaching_output", ""),
                    usage={},
                )
            except Exception as e:
                logger.warning(f"Coach graph failed, falling back to DirectExecutionStrategy: {e}")

        strat = strategy or self._default_strategy
        return await strat.execute(user_id, query, conversation, session)


class JournalAgent:
    """Journal analysis agent. Uses LangGraph for pattern detection."""

    name = "journal"

    def __init__(self, default_strategy=None):
        self._default_strategy = default_strategy

    def can_handle(self, intent_name: str) -> bool:
        return intent_name == "journal"

    async def execute(self, user_id, query, conversation, session, strategy=None):
        strat = strategy or self._default_strategy
        return await strat.execute(user_id, query, conversation, session)


class ResearchAgent:
    """Research agent. Uses LangGraph for multi-source analysis."""

    name = "research"

    def __init__(self, default_strategy=None):
        self._default_strategy = default_strategy

    def can_handle(self, intent_name: str) -> bool:
        return intent_name == "research"

    async def execute(self, user_id, query, conversation, session, strategy=None):
        strat = strategy or self._default_strategy
        return await strat.execute(user_id, query, conversation, session)
