from __future__ import annotations

import time
import uuid
import logging

from .models import Stage, TraceSpan, SpanHandle, RequestTrace

logger = logging.getLogger("ai_service.telemetry.tracer")


class Tracer:
    """Request-scoped tracer. One instance per request. Handle-based API."""

    def __init__(self):
        self._spans: list[TraceSpan] = []
        self._start: float = 0.0

    def start_request(self):
        self._start = time.monotonic()

    def begin(self, stage: Stage, parent: SpanHandle | None = None) -> SpanHandle:
        return SpanHandle(
            span_id=str(uuid.uuid4())[:8],
            stage=stage,
            started_at=time.monotonic(),
            parent_span_id=parent.span_id if parent else None,
        )

    def finish(self, handle: SpanHandle, attributes: dict | None = None):
        ended_at = time.monotonic()
        span = TraceSpan(
            span_id=handle.span_id,
            stage=handle.stage,
            started_at=handle.started_at,
            ended_at=ended_at,
            latency_ms=(ended_at - handle.started_at) * 1000,
            parent_span_id=handle.parent_span_id,
            attributes=attributes or {},
        )
        self._spans.append(span)
        return span

    def build_trace(
        self, request_id: str, trace_id: str, user_id: str, query: str,
    ) -> RequestTrace:
        total = (time.monotonic() - self._start) * 1000 if self._start else 0.0
        return RequestTrace(
            request_id=request_id,
            trace_id=trace_id,
            user_id=user_id,
            query=query,
            spans=list(self._spans),
            total_latency_ms=total,
            timestamp=time.time(),
        )
