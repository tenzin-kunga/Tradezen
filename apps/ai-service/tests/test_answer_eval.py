from __future__ import annotations

import pytest
from app.evaluation.answer_eval import (
    ExpectedOutcome,
    ExecutionContract,
    AnswerContract,
    EvidenceChain,
    AnswerEvaluator,
    DimensionScore,
    PipelineCheck,
    build_evidence_chain,
    _value_present,
    _unit_covered,
)
from app.planner.models import StepType
from app.telemetry.models import RequestTrace, Stage, TraceSpan


# ── Model tests ──────────────────────────────────────────────

class TestExecutionContract:
    def test_frozen(self):
        ec = ExecutionContract(required_intent="analytics", required_steps=[StepType.SQL])
        with pytest.raises(AttributeError):
            ec.required_intent = "other"

    def test_defaults(self):
        ec = ExecutionContract(required_intent="chat")
        assert ec.required_steps == []
        assert ec.required_metrics == []
        assert ec.requires_grounding is True


class TestAnswerContract:
    def test_frozen(self):
        ac = AnswerContract(requires_numeric=True, required_information_units=["win_rate"])
        with pytest.raises(AttributeError):
            ac.requires_numeric = False

    def test_defaults(self):
        ac = AnswerContract()
        assert ac.requires_numeric is False
        assert ac.required_information_units == []


class TestExpectedOutcome:
    def test_frozen(self):
        eo = ExpectedOutcome(
            execution=ExecutionContract(required_intent="analytics"),
            answer=AnswerContract(requires_numeric=True),
        )
        with pytest.raises(AttributeError):
            eo.execution = ExecutionContract(required_intent="other")


# ── EvidenceChain tests ──────────────────────────────────────

class TestEvidenceChain:
    def test_empty_chain(self):
        chain = EvidenceChain()
        assert chain.retrieved_count == 0
        assert chain.budgeted_count == 0
        assert chain.referenced_count == 0
        assert chain.evidence_loss_budgeting == 0.0
        assert chain.evidence_loss_generation == 0.0

    def test_counts(self):
        chain = EvidenceChain(
            retrieved_ids=["a", "b", "c"],
            budgeted_ids=["a", "b"],
            referenced_ids=["a"],
        )
        assert chain.retrieved_count == 3
        assert chain.budgeted_count == 2
        assert chain.referenced_count == 1

    def test_loss_budgeting(self):
        chain = EvidenceChain(
            retrieved_ids=["a", "b", "c"],
            budgeted_ids=["a", "b"],
            referenced_ids=["a", "b"],
        )
        assert chain.evidence_loss_budgeting == pytest.approx(1 / 3)
        assert chain.evidence_loss_generation == 0.0

    def test_loss_generation(self):
        chain = EvidenceChain(
            retrieved_ids=["a", "b", "c"],
            budgeted_ids=["a", "b", "c"],
            referenced_ids=["a"],
        )
        assert chain.evidence_loss_budgeting == 0.0
        assert chain.evidence_loss_generation == pytest.approx(2 / 3)

    def test_metrics_computed(self):
        chain = EvidenceChain(
            retrieved_ids=["a", "b"],
            budgeted_ids=["a", "b"],
            referenced_ids=["a"],
        )
        assert chain.retrieval_recall == 1.0
        assert chain.budget_recall == 1.0
        assert chain.evidence_utilization == 0.5


# ── Helper tests ─────────────────────────────────────────────

class TestHelpers:
    def test_value_present_numeric(self):
        assert _value_present("My win rate is 62.4%", "Win rate: 62.4%") is True

    def test_value_present_absent(self):
        assert _value_present("My win rate is 62.4%", "Win rate: 70%") is False

    def test_value_present_empty(self):
        assert _value_present("anything", "") is False

    def test_unit_covered_win_rate(self):
        assert _unit_covered("Your win rate is 62%", "win_rate_value") is True

    def test_unit_covered_missing(self):
        assert _unit_covered("No mention", "win_rate_value") is False

    def test_unit_covered_trade_summary(self):
        assert _unit_covered("You bought EURUSD at 1.10", "trade_summary") is True


# ── Evaluator tests ──────────────────────────────────────────

class TestAnswerEvaluator:
    def test_load_cases(self):
        ev = AnswerEvaluator()
        cases = ev.load_cases()
        assert len(cases) >= 10
        assert cases[0]["id"] == "ans_001"

    def test_parse_expected(self):
        ev = AnswerEvaluator()
        case = {
            "expected": {
                "execution": {
                    "required_intent": "analytics",
                    "required_steps": ["sql"],
                    "required_metrics": ["win_rate"],
                },
                "answer": {
                    "requires_numeric": True,
                    "required_information_units": ["win_rate_value"],
                },
            }
        }
        eo = ev._parse_expected(case)
        assert eo.execution.required_intent == "analytics"
        assert eo.execution.required_steps == [StepType.SQL]
        assert eo.answer.requires_numeric is True

    def test_eval_clarity_pass(self):
        ev = AnswerEvaluator()
        score = ev._eval_clarity("Your win rate is 62%. You won 10 out of 16 trades.")
        assert score.passed is True

    def test_eval_clarity_too_short(self):
        ev = AnswerEvaluator()
        score = ev._eval_clarity("Yes")
        assert score.score < 1.0

    def test_eval_clarity_wall_of_text(self):
        ev = AnswerEvaluator()
        # Long single line with no formatting → fails length check
        score = ev._eval_clarity("word " * 500)
        assert score.score < 1.0

    def test_eval_completeness_all_covered(self):
        ev = AnswerEvaluator()
        eo = ExpectedOutcome(
            execution=ExecutionContract(required_intent="analytics"),
            answer=AnswerContract(required_information_units=["win_rate_value"]),
        )
        score = ev._eval_completeness("Your win rate is 62%", eo)
        assert score.passed is True

    def test_eval_completeness_missing(self):
        ev = AnswerEvaluator()
        eo = ExpectedOutcome(
            execution=ExecutionContract(required_intent="analytics"),
            answer=AnswerContract(required_information_units=["win_rate_value", "total_pnl_value"]),
        )
        score = ev._eval_completeness("Your win rate is 62%", eo)
        assert score.passed is False

    def test_eval_completeness_no_units(self):
        ev = AnswerEvaluator()
        eo = ExpectedOutcome(
            execution=ExecutionContract(required_intent="chat"),
            answer=AnswerContract(required_information_units=[]),
        )
        score = ev._eval_completeness("anything", eo)
        assert score.passed is True


# ── PipelineCheck tests ──────────────────────────────────────

class TestPipelineCheck:
    def test_all_false_by_default(self):
        pc = PipelineCheck()
        assert pc.intent_correct is False
        assert pc.planner_correct is False
        assert pc.engine_executed is False

    def test_all_true(self):
        pc = PipelineCheck(intent_correct=True, planner_correct=True, engine_executed=True)
        assert all([pc.intent_correct, pc.planner_correct, pc.engine_executed])
