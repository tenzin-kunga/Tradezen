import pytest
from unittest.mock import MagicMock, AsyncMock
from app.planner.models import (
    StepType, RagConfig, SqlConfig, ExecutionStep, QueryPlan,
    PlanningResult, PlanningRequest,
)
from app.planner.rules import QueryPlanner, PlanRule, _has_journal_signal
from app.intent.router import IntentResult
from app.models.common import Complexity, ExecutionMode
from unittest.mock import MagicMock


def _make_intent(intent: str) -> IntentResult:
    return IntentResult(
        intent=intent,
        complexity=Complexity.SIMPLE,
        execution=ExecutionMode.DIRECT,
        confidence=0.8,
    )


def _make_request(query: str, intent: str) -> PlanningRequest:
    return PlanningRequest(
        query=query,
        intent=_make_intent(intent),
        session=MagicMock(),
    )


# ── Models ───────────────────────────────────────────────────
class TestModels:
    def test_execution_step_frozen(self):
        step = ExecutionStep(type=StepType.RAG, config=RagConfig())
        with pytest.raises(AttributeError):
            step.type = StepType.SQL

    def test_query_plan_frozen(self):
        plan = QueryPlan(steps=[ExecutionStep(type=StepType.RAG)], template="chat")
        with pytest.raises(AttributeError):
            plan.template = "analytics"

    def test_rag_config_defaults(self):
        cfg = RagConfig()
        assert cfg.top_k == 5
        assert cfg.min_score == 0.5
        assert "trade" in cfg.source_types

    def test_sql_config_capabilities(self):
        cfg = SqlConfig(capabilities=["win_rate", "all_stats"])
        assert len(cfg.capabilities) == 2


# ── Planner rules ────────────────────────────────────────────
class TestQueryPlanner:
    def test_analytics_sql(self):
        planner = QueryPlanner()
        req = _make_request("What is my win rate?", "analytics")
        result = planner.plan(req)
        assert result.matched_rule == "analytics_sql"
        assert len(result.plan.steps) == 1
        assert result.plan.steps[0].type == StepType.SQL
        assert result.plan.template == "analytics"

    def test_analytics_hybrid_with_journal(self):
        planner = QueryPlanner()
        req = _make_request("What is my win rate from my journal notes?", "analytics")
        result = planner.plan(req)
        assert result.matched_rule == "hybrid"
        assert len(result.plan.steps) == 2
        assert result.plan.steps[0].type == StepType.SQL
        assert result.plan.steps[1].type == StepType.RAG

    def test_journal_rag(self):
        planner = QueryPlanner()
        req = _make_request("What did I trade yesterday?", "journal")
        result = planner.plan(req)
        assert result.matched_rule == "journal_rag"
        assert len(result.plan.steps) == 1
        assert result.plan.steps[0].type == StepType.RAG
        cfg = result.plan.steps[0].config
        assert "journal" in cfg.source_types
        assert "memory" in cfg.source_types

    def test_coach_rag(self):
        planner = QueryPlanner()
        req = _make_request("Why do I keep revenge trading?", "coach")
        result = planner.plan(req)
        assert result.matched_rule == "coach_rag"
        assert result.plan.steps[0].type == StepType.RAG
        assert result.plan.steps[0].config.top_k == 10

    def test_research(self):
        planner = QueryPlanner()
        req = _make_request("Analyze AAPL stock.", "research")
        result = planner.plan(req)
        assert result.matched_rule == "research"
        assert len(result.plan.steps) == 0

    def test_general_default(self):
        planner = QueryPlanner()
        req = _make_request("What is a stop loss?", "general")
        result = planner.plan(req)
        assert result.matched_rule == "default"
        assert result.plan.steps[0].type == StepType.RAG

    def test_planner_latency(self):
        planner = QueryPlanner()
        req = _make_request("test", "general")
        result = planner.plan(req)
        assert result.planner_latency_ms >= 0

    def test_custom_rules(self):
        custom = [PlanRule(
            name="custom",
            matcher=lambda req: True,
            plan=QueryPlan(steps=[], template="custom"),
        )]
        planner = QueryPlanner(custom)
        result = planner.plan(_make_request("anything", "general"))
        assert result.matched_rule == "custom"


# ── Journal signal detection ─────────────────────────────────
class TestJournalSignal:
    def test_has_journal_signal(self):
        assert _has_journal_signal("What is my win rate from my journal?")
        assert _has_journal_signal("What did I write about revenge trading?")
        assert _has_journal_signal("Show me my notes on EURUSD.")
        assert _has_journal_signal("What lessons did I learn?")

    def test_no_journal_signal(self):
        assert not _has_journal_signal("What is my win rate?")
        assert not _has_journal_signal("How much did I make this month?")
        assert not _has_journal_signal("What is my profit factor?")


# ── AnalyticsService ─────────────────────────────────────────
class TestAnalyticsService:
    @pytest.mark.asyncio
    async def test_execute_capability(self):
        from app.services.analytics_service import AnalyticsService
        mock_tool = MagicMock()
        mock_tool.get_all_stats = MagicMock(return_value="stats")
        svc = AnalyticsService(analytics_tool=mock_tool)
        result = await svc.execute("all_stats", "user1")
        mock_tool.get_all_stats.assert_called_once_with("user1")

    def test_capabilities_list(self):
        from app.services.analytics_service import AnalyticsService
        svc = AnalyticsService(analytics_tool=MagicMock())
        caps = svc.capabilities()
        assert "win_rate" in caps
        assert "all_stats" in caps
        assert "total_pnl" in caps

    @pytest.mark.asyncio
    async def test_unknown_capability(self):
        from app.services.analytics_service import AnalyticsService
        svc = AnalyticsService(analytics_tool=MagicMock())
        result = await svc.execute("nonexistent", "user1")
        assert result.confidence == 0.0


# ── ExecutionEngine ──────────────────────────────────────────
class TestExecutionEngine:
    @pytest.mark.asyncio
    async def test_sql_only(self):
        from app.execution.engine import ExecutionEngine
        from app.models.common import ToolResult
        mock_analytics = AsyncMock()
        mock_analytics.execute = AsyncMock(return_value=ToolResult(tool_name="sql", content="Win rate: 55%"))
        engine = ExecutionEngine(analytics_service=mock_analytics)
        plan = QueryPlan(
            steps=[ExecutionStep(type=StepType.SQL, config=SqlConfig(capabilities=["all_stats"]))],
            template="analytics",
        )
        result = await engine.execute("user1", plan, "What is my win rate?")
        assert "sql" in result.completed_steps
        assert len(result.sql_results) == 1

    @pytest.mark.asyncio
    async def test_rag_only(self):
        from app.execution.engine import ExecutionEngine
        mock_retrieval = AsyncMock()
        mock_result = MagicMock()
        mock_result.documents = [MagicMock(document_id="d1")]
        mock_retrieval.retrieve = AsyncMock(return_value=mock_result)
        engine = ExecutionEngine(retrieval_pipeline=mock_retrieval)
        plan = QueryPlan(
            steps=[ExecutionStep(type=StepType.RAG, config=RagConfig(top_k=3))],
            template="journal",
        )
        result = await engine.execute("user1", plan, "What did I trade?")
        assert "rag" in result.completed_steps
        assert len(result.retrieved_docs) == 1

    @pytest.mark.asyncio
    async def test_hybrid_parallel(self):
        from app.execution.engine import ExecutionEngine
        from app.models.common import ToolResult
        mock_analytics = AsyncMock()
        mock_analytics.execute = AsyncMock(return_value=ToolResult(tool_name="sql", content="stats"))
        mock_retrieval = AsyncMock()
        mock_result = MagicMock()
        mock_result.documents = [MagicMock(document_id="d1")]
        mock_retrieval.retrieve = AsyncMock(return_value=mock_result)
        engine = ExecutionEngine(analytics_service=mock_analytics, retrieval_pipeline=mock_retrieval)
        plan = QueryPlan(
            steps=[
                ExecutionStep(type=StepType.SQL, config=SqlConfig(capabilities=["all_stats"])),
                ExecutionStep(type=StepType.RAG, config=RagConfig()),
            ],
            template="analytics",
        )
        result = await engine.execute("user1", plan, "What is my win rate from my journal?")
        assert "sql" in result.completed_steps
        assert "rag" in result.completed_steps

    @pytest.mark.asyncio
    async def test_no_steps(self):
        from app.execution.engine import ExecutionEngine
        engine = ExecutionEngine()
        plan = QueryPlan(steps=[], template="research")
        result = await engine.execute("user1", plan, "Analyze AAPL.")
        assert result.completed_steps == []
