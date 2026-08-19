from __future__ import annotations

import time
import uuid
from enum import Enum
from dataclasses import dataclass, field

from ..models.common import SessionMetrics


class Stage(str, Enum):
    INTENT = "intent"
    PLANNER = "planner"
    SQL = "sql"
    RETRIEVAL = "retrieval"
    RAG = "rag"
    PROMPT = "prompt"
    LLM = "llm"
    BACKGROUND = "background"


@dataclass(frozen=True)
class TraceSpan:
    span_id: str
    stage: Stage
    started_at: float
    ended_at: float
    latency_ms: float
    parent_span_id: str | None = None
    attributes: dict = field(default_factory=dict)


@dataclass(frozen=True)
class SpanHandle:
    """Lightweight handle returned by tracer.begin(). Not a span."""
    span_id: str
    stage: Stage
    started_at: float
    parent_span_id: str | None = None


@dataclass
class RequestTrace:
    request_id: str
    trace_id: str
    user_id: str
    query: str
    spans: list[TraceSpan] = field(default_factory=list)
    total_latency_ms: float = 0.0
    timestamp: float = 0.0

    def stage_latency(self, stage: Stage) -> float:
        return sum(s.latency_ms for s in self.spans if s.stage == stage)
