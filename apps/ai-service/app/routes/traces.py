from __future__ import annotations

from fastapi import APIRouter, Query, Request
from ..telemetry.memory_store import InMemoryTracesStore
from ..telemetry.latency_report import LatencyReporter
from ..telemetry.repository import TraceQuery

router = APIRouter(prefix="/traces", tags=["traces"])

# Injected by main.py
_store: InMemoryTracesStore | None = None
_reporter = LatencyReporter()


def init(store: InMemoryTracesStore):
    global _store
    _store = store


@router.get("/recent")
async def get_recent_traces(
    request: Request,
    limit: int = Query(default=50, le=200),
):
    if not _store:
        return {"traces": [], "total": 0}
    user_id = request.state.session.user_id
    traces = await _store.query(
        filters=TraceQuery(user_id=user_id, limit=limit)
    )
    return {
        "traces": [
            {
                "request_id": t.request_id,
                "user_id": t.user_id,
                "query": t.query,
                "total_latency_ms": round(t.total_latency_ms, 1),
                "span_count": len(t.spans),
                "timestamp": t.timestamp,
                "stages": [s.stage.value for s in t.spans],
            }
            for t in traces
        ],
        "total": len(traces),
    }


@router.get("/{request_id}")
async def get_trace(request: Request, request_id: str):
    if not _store:
        return {"error": "Trace store not available"}
    trace = await _store.get(request_id)
    if not trace or trace.user_id != request.state.session.user_id:
        return {"error": "Trace not found", "request_id": request_id}
    return {
        "request_id": trace.request_id,
        "trace_id": trace.trace_id,
        "user_id": trace.user_id,
        "query": trace.query,
        "total_latency_ms": round(trace.total_latency_ms, 1),
        "timestamp": trace.timestamp,
        "spans": [
            {
                "span_id": s.span_id,
                "stage": s.stage.value,
                "latency_ms": round(s.latency_ms, 1),
                "parent_span_id": s.parent_span_id,
                "attributes": s.attributes,
            }
            for s in trace.spans
        ],
        "timeline": _reporter.timeline(trace),
    }


@router.get("/stats/latency")
async def get_latency_stats(
    request: Request,
    limit: int = Query(default=100, le=500),
):
    if not _store:
        return {"error": "Trace store not available"}
    user_id = request.state.session.user_id
    traces = await _store.query(
        filters=TraceQuery(user_id=user_id, limit=limit)
    )
    return _reporter.report(traces)
