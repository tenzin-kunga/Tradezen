from __future__ import annotations

from .models import Stage, RequestTrace
from ..models.common import SessionMetrics


class MetricsProjector:
    """Derives application metrics from traces. Single source of truth."""

    @staticmethod
    def to_session_metrics(trace: RequestTrace) -> SessionMetrics:
        return SessionMetrics(
            request_id=trace.request_id,
            planner_ms=trace.stage_latency(Stage.PLANNER),
            sql_ms=trace.stage_latency(Stage.SQL),
            retrieval_ms=trace.stage_latency(Stage.RETRIEVAL),
            prompt_build_ms=trace.stage_latency(Stage.PROMPT),
            generation_ms=trace.stage_latency(Stage.LLM),
            total_latency_ms=trace.total_latency_ms,
            intent=_find_attr(trace, Stage.INTENT, "intent", ""),
            planner_rule=_find_attr(trace, Stage.PLANNER, "rule", ""),
            completed_steps=_find_attr(trace, Stage.PLANNER, "step_types", []),
        )


def _find_attr(trace: RequestTrace, stage: Stage, key: str, default):
    for s in trace.spans:
        if s.stage == stage:
            return s.attributes.get(key, default)
    return default
