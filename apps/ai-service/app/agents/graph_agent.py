from __future__ import annotations

import logging
import time
from typing import Any

from ..execution.base import ExecutionResult

logger = logging.getLogger("ai_service.agents.graphs")


class GraphAgent:
    """Base class for LangGraph-backed agents. Subclasses define state and output extraction."""

    name: str = "graph"
    state_cls: Any = None
    output_field: str = ""

    def __init__(self, default_strategy=None, graph=None):
        self._default_strategy = default_strategy
        self._graph = graph

    def can_handle(self, intent_name: str) -> bool:
        return intent_name == self.name

    def _build_state(self, user_id: str, query: str, session) -> Any:
        return self.state_cls(
            user_id=user_id,
            request_id=getattr(session, "request_id", ""),
            trace_id=getattr(session, "trace_id", ""),
            query=query,
        )

    def _extract_result(self, result: Any) -> str:
        if isinstance(result, dict):
            return result.get(self.output_field, "")
        return getattr(result, self.output_field, "")

    async def execute(self, user_id, query, conversation, session, strategy=None):
        if self._graph:
            state = self._build_state(user_id, query, session)
            try:
                start = time.monotonic()
                result = await self._graph.ainvoke(state)
                elapsed = (time.monotonic() - start) * 1000
                content = self._extract_result(result)
                logger.info(
                    f"{self.name}_graph completed",
                    extra={
                        "stage": self.name,
                        "duration_ms": round(elapsed, 1),
                        "request_id": getattr(state, "request_id", ""),
                        "user_id": user_id,
                    },
                )
                return ExecutionResult(content=content, usage={})
            except Exception as e:
                logger.warning(f"{self.name} graph failed, falling back to DirectExecutionStrategy: {e}")

        strat = strategy or self._default_strategy
        return await strat.execute(user_id, query, conversation, session)


class CoachAgent(GraphAgent):
    """Coaching agent. Uses LangGraph workflow for multi-stage analysis."""

    name = "coach"
    state_cls = None  # Set after import to avoid circular
    output_field = "coaching_output"

    def __init__(self, **kwargs):
        from .graphs.states import CoachState
        self.__class__.state_cls = CoachState
        super().__init__(**kwargs)


class JournalAgent(GraphAgent):
    """Journal analysis agent. Uses LangGraph for pattern detection."""

    name = "journal"
    state_cls = None  # Set after import to avoid circular
    output_field = "recommendations"

    def __init__(self, **kwargs):
        from .graphs.states import JournalState
        self.__class__.state_cls = JournalState
        super().__init__(**kwargs)

    def _extract_result(self, result: Any) -> str:
        recs = super()._extract_result(result)
        if isinstance(recs, list):
            return "\n".join(str(r) for r in recs)
        return str(recs) if recs else ""


class ResearchAgent(GraphAgent):
    """Research agent. Uses LangGraph for multi-source analysis."""

    name = "research"
    state_cls = None  # Set after import to avoid circular
    output_field = "final_report"

    def __init__(self, **kwargs):
        from .graphs.states import ResearchState
        self.__class__.state_cls = ResearchState
        super().__init__(**kwargs)
