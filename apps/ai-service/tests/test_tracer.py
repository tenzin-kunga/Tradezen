import pytest
import time
from app.telemetry.models import Stage, TraceSpan, SpanHandle, RequestTrace
from app.telemetry.tracer import Tracer
from app.telemetry.metrics_projector import MetricsProjector
from app.telemetry.memory_store import InMemoryTracesStore
from app.telemetry.repository import TraceQuery
from app.telemetry.latency_report import LatencyReporter, percentile


# ── Models ───────────────────────────────────────────────────
class TestModels:
    def test_stage_enum_values(self):
        assert Stage.INTENT == "intent"
        assert Stage.PLANNER == "planner"
        assert Stage.SQL == "sql"
        assert Stage.RETRIEVAL == "retrieval"
        assert Stage.LLM == "llm"

    def test_trace_span_frozen(self):
        span = TraceSpan(
            span_id="abc", stage=Stage.INTENT, started_at=1.0, ended_at=2.0, latency_ms=1000.0,
        )
        with pytest.raises(AttributeError):
            span.stage = Stage.SQL

    def test_span_handle_frozen(self):
        h = SpanHandle(span_id="x", stage=Stage.PLANNER, started_at=1.0)
        with pytest.raises(AttributeError):
            h.stage = Stage.SQL

    def test_request_trace_stage_latency(self):
        trace = RequestTrace(request_id="r1", trace_id="t1", user_id="u1", query="test")
        trace.spans = [
            TraceSpan(span_id="s1", stage=Stage.INTENT, started_at=0, ended_at=1, latency_ms=1.0),
            TraceSpan(span_id="s2", stage=Stage.PLANNER, started_at=1, ended_at=3, latency_ms=2.0),
            TraceSpan(span_id="s3", stage=Stage.INTENT, started_at=3, ended_at=4, latency_ms=1.0),
        ]
        assert trace.stage_latency(Stage.INTENT) == 2.0
        assert trace.stage_latency(Stage.PLANNER) == 2.0
        assert trace.stage_latency(Stage.SQL) == 0.0


# ── Tracer ───────────────────────────────────────────────────
class TestTracer:
    def test_request_scoped(self):
        t1 = Tracer()
        t2 = Tracer()
        t1.start_request()
        h = t1.begin(Stage.INTENT)
        t1.finish(h, {"intent": "analytics"})
        trace1 = t1.build_trace("r1", "t1", "u1", "q1")
        trace2 = t2.build_trace("r2", "t2", "u2", "q2")
        assert len(trace1.spans) == 1
        assert len(trace2.spans) == 0

    def test_begin_returns_handle(self):
        tracer = Tracer()
        h = tracer.begin(Stage.PLANNER)
        assert isinstance(h, SpanHandle)
        assert h.stage == Stage.PLANNER
        assert len(h.span_id) == 8

    def test_finish_creates_immutable_span(self):
        tracer = Tracer()
        h = tracer.begin(Stage.INTENT)
        span = tracer.finish(h, {"intent": "analytics"})
        assert isinstance(span, TraceSpan)
        assert span.stage == Stage.INTENT
        assert span.latency_ms >= 0
        assert span.attributes["intent"] == "analytics"

    def test_parent_span_id(self):
        tracer = Tracer()
        parent = tracer.begin(Stage.PLANNER)
        child = tracer.begin(Stage.SQL, parent=parent)
        assert child.parent_span_id == parent.span_id

    def test_build_trace(self):
        tracer = Tracer()
        tracer.start_request()
        h = tracer.begin(Stage.INTENT)
        tracer.finish(h, {"intent": "coach"})
        h2 = tracer.begin(Stage.LLM)
        tracer.finish(h2, {"model": "qwen3"})
        trace = tracer.build_trace("req1", "trc1", "user1", "hello")
        assert trace.request_id == "req1"
        assert len(trace.spans) == 2
        assert trace.total_latency_ms >= 0
        assert trace.timestamp > 0


# ── MetricsProjector ─────────────────────────────────────────
class TestMetricsProjector:
    def test_derives_session_metrics(self):
        trace = RequestTrace(request_id="r1", trace_id="t1", user_id="u1", query="test")
        trace.spans = [
            TraceSpan(span_id="s1", stage=Stage.INTENT, started_at=0, ended_at=1, latency_ms=1.0, attributes={"intent": "analytics"}),
            TraceSpan(span_id="s2", stage=Stage.PLANNER, started_at=1, ended_at=3, latency_ms=2.0, attributes={"rule": "analytics_sql"}),
            TraceSpan(span_id="s3", stage=Stage.SQL, started_at=3, ended_at=5, latency_ms=2.0),
        ]
        trace.total_latency_ms = 5.0
        metrics = MetricsProjector.to_session_metrics(trace)
        assert metrics.planner_ms == 2.0
        assert metrics.sql_ms == 2.0
        assert metrics.intent == "analytics"
        assert metrics.planner_rule == "analytics_sql"
        assert metrics.total_latency_ms == 5.0


# ── InMemoryTracesStore ──────────────────────────────────────
class TestInMemoryTracesStore:
    @pytest.mark.asyncio
    async def test_save_and_get(self):
        store = InMemoryTracesStore()
        trace = RequestTrace(request_id="r1", trace_id="t1", user_id="u1", query="test")
        await store.save(trace)
        result = await store.get("r1")
        assert result is not None
        assert result.request_id == "r1"

    @pytest.mark.asyncio
    async def test_get_missing(self):
        store = InMemoryTracesStore()
        result = await store.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_query_recent(self):
        store = InMemoryTracesStore()
        for i in range(5):
            await store.save(RequestTrace(request_id=f"r{i}", trace_id=f"t{i}", user_id="u1", query=f"q{i}"))
        results = await store.query(TraceQuery(limit=3))
        assert len(results) == 3
        assert results[-1].request_id == "r4"

    @pytest.mark.asyncio
    async def test_query_by_user(self):
        store = InMemoryTracesStore()
        await store.save(RequestTrace(request_id="r1", trace_id="t1", user_id="u1", query="q1"))
        await store.save(RequestTrace(request_id="r2", trace_id="t2", user_id="u2", query="q2"))
        await store.save(RequestTrace(request_id="r3", trace_id="t3", user_id="u1", query="q3"))
        results = await store.query(TraceQuery(user_id="u1"))
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_max_traces(self):
        store = InMemoryTracesStore(max_traces=3)
        for i in range(5):
            await store.save(RequestTrace(request_id=f"r{i}", trace_id=f"t{i}", user_id="u", query="q"))
        results = await store.query()
        assert len(results) == 3
        assert results[0].request_id == "r2"  # oldest kept


# ── LatencyReporter ──────────────────────────────────────────
class TestLatencyReporter:
    def test_report_empty(self):
        reporter = LatencyReporter()
        report = reporter.report([])
        assert report["total_requests"] == 0

    def test_report_with_traces(self):
        reporter = LatencyReporter()
        traces = []
        for i in range(10):
            t = RequestTrace(request_id=f"r{i}", trace_id=f"t{i}", user_id="u", query="q")
            latency = float((i + 1) * 10)  # 10, 20, ..., 100
            t.spans = [TraceSpan(span_id=f"s{i}", stage=Stage.LLM, started_at=0, ended_at=1, latency_ms=latency)]
            t.total_latency_ms = latency
            traces.append(t)
        report = reporter.report(traces)
        assert report["total_requests"] == 10
        assert "llm" in report["by_stage"]
        assert report["by_stage"]["llm"]["count"] == 10

    def test_timeline(self):
        reporter = LatencyReporter()
        trace = RequestTrace(request_id="req123", trace_id="t", user_id="u", query="q")
        trace.spans = [
            TraceSpan(span_id="s1", stage=Stage.INTENT, started_at=0, ended_at=1, latency_ms=0.5),
            TraceSpan(span_id="s2", stage=Stage.LLM, started_at=1, ended_at=6, latency_ms=5000.0),
        ]
        trace.total_latency_ms = 5000.5
        timeline = reporter.timeline(trace)
        assert "req123" in timeline
        assert "intent" in timeline
        assert "llm" in timeline
        assert "Total" in timeline

    def test_percentile(self):
        data = list(range(100))
        assert percentile(data, 50) == 49.5
        assert percentile(data, 95) == 94.05
        assert percentile([], 50) == 0.0
