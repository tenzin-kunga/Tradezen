from __future__ import annotations

import json
import time
import logging
from pathlib import Path
from dataclasses import dataclass, field

from ..planner.models import StepType
from ..telemetry.models import RequestTrace, Stage

logger = logging.getLogger("ai_service.answer_eval")


# ── Contracts ────────────────────────────────────────────────

@dataclass(frozen=True)
class ExecutionContract:
    """What the system should do for this question."""
    required_intent: str
    required_steps: list[StepType] = field(default_factory=list)
    required_metrics: list[str] = field(default_factory=list)
    requires_grounding: bool = True


@dataclass(frozen=True)
class AnswerContract:
    """What the answer should contain."""
    requires_numeric: bool = False
    required_information_units: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ExpectedOutcome:
    """Combined contract: execution + answer."""
    execution: ExecutionContract
    answer: AnswerContract


# ── Evidence chain ───────────────────────────────────────────

@dataclass
class EvidenceChain:
    """Three-stage evidence tracking with IDs."""
    retrieved_ids: list[str] = field(default_factory=list)
    budgeted_ids: list[str] = field(default_factory=list)
    referenced_ids: list[str] = field(default_factory=list)

    retrieval_recall: float = 0.0
    budget_recall: float = 0.0
    evidence_utilization: float = 0.0
    evidence_loss_budgeting: float = 0.0
    evidence_loss_generation: float = 0.0

    def __post_init__(self):
        r = len(self.retrieved_ids)
        b = len(self.budgeted_ids)
        ref = len(self.referenced_ids)

        self.retrieval_recall = min(r, 1.0) if r > 0 else 0.0
        self.budget_recall = min(b / r, 1.0) if r > 0 else 0.0
        self.evidence_utilization = min(ref / b, 1.0) if b > 0 else 0.0
        self.evidence_loss_budgeting = (r - b) / r if r > 0 else 0.0
        self.evidence_loss_generation = (b - ref) / b if b > 0 else 0.0

    @property
    def retrieved_count(self) -> int:
        return len(self.retrieved_ids)

    @property
    def budgeted_count(self) -> int:
        return len(self.budgeted_ids)

    @property
    def referenced_count(self) -> int:
        return len(self.referenced_ids)


# ── Dimension scores ─────────────────────────────────────────

@dataclass(frozen=True)
class DimensionScore:
    score: float
    passed: bool
    reason: str


# ── Pipeline diagnostics ─────────────────────────────────────

@dataclass
class PipelineCheck:
    intent_correct: bool = False
    planner_correct: bool = False
    engine_executed: bool = False


# ── Full result ──────────────────────────────────────────────

@dataclass
class AnswerResult:
    case_id: str
    question: str
    response: str
    expected: ExpectedOutcome

    pipeline: PipelineCheck
    evidence_chain: EvidenceChain
    correctness: DimensionScore
    completeness: DimensionScore
    grounding: DimensionScore
    clarity: DimensionScore

    latency: dict = field(default_factory=dict)
    passed: bool = False


# ── Helpers ──────────────────────────────────────────────────

def find_span(trace: RequestTrace, stage: Stage):
    for s in trace.spans:
        if s.stage == stage:
            return s
    return None


def _value_present(response: str, value: str) -> bool:
    """Check if a value from execution output appears in the response."""
    if not value:
        return False
    # Extract numeric part from value (e.g., "Win rate: 62.4%" → "62.4")
    import re
    numbers = re.findall(r"[\d.]+%?", value)
    if not numbers:
        return value.lower() in response.lower()
    return any(n in response for n in numbers)


def _unit_covered(response: str, unit: str) -> bool:
    """Check if an information unit is covered in the response."""
    # Simple mapping: unit name → expected content
    unit_keywords = {
        "win_rate_value": ["win rate", "won", "%"],
        "total_pnl_value": ["pnl", "p&l", "profit", "loss", "$"],
        "trade_summary": ["trade", "position", "bought", "sold"],
        "biggest_mistake": ["mistake", "error", "wrong", "lesson"],
        "repeated_mistakes": ["repeated", "pattern", "kept", "again"],
        "mood_feeling": ["feel", "mood", "emotion", "felt"],
        "journal_entry": ["journal", "wrote", "noted", "entry"],
    }
    keywords = unit_keywords.get(unit, [unit.replace("_", " ")])
    lower = response.lower()
    return any(kw.lower() in lower for kw in keywords)


def _find_referenced_ids(response: str, evidence_ids: list[str]) -> list[str]:
    """Find which evidence IDs are referenced in the response."""
    referenced = []
    for eid in evidence_ids:
        # Check if the ID or a derivative appears in the response
        if eid.lower() in response.lower() or eid[:4].lower() in response.lower():
            referenced.append(eid)
    return referenced


# ── Evidence chain builder ───────────────────────────────────

def build_evidence_chain(response: str, trace: RequestTrace, expected: ExpectedOutcome) -> EvidenceChain:
    """Build evidence chain from trace, tracking IDs through each stage."""
    rag_span = find_span(trace, Stage.RAG)
    sql_span = find_span(trace, Stage.SQL)
    prompt_span = find_span(trace, Stage.PROMPT)

    # Stage 1: Retrieved IDs
    retrieved_ids = []
    if rag_span:
        retrieved_ids.extend(rag_span.attributes.get("document_ids", []))
    if sql_span:
        retrieved_ids.extend(sql_span.attributes.get("result_ids", []))

    # Stage 2: Budgeted IDs (made it to prompt)
    budgeted_ids = prompt_span.attributes.get("evidence_ids", []) if prompt_span else []

    # Stage 3: Referenced IDs (in answer)
    referenced_ids = _find_referenced_ids(response, retrieved_ids)

    # Derived metrics
    r_count = len(retrieved_ids)
    b_count = len(budgeted_ids)
    ref_count = len(referenced_ids)

    required_count = max(len(expected.execution.required_metrics), 1)
    retrieval_recall = min(r_count / required_count, 1.0) if r_count > 0 else 0.0
    budget_recall = min(b_count / r_count, 1.0) if r_count > 0 else 0.0
    utilization = min(ref_count / b_count, 1.0) if b_count > 0 else 0.0

    # Loss computation
    loss_budgeting = (r_count - b_count) / r_count if r_count > 0 else 0.0
    loss_generation = (b_count - ref_count) / b_count if b_count > 0 else 0.0

    return EvidenceChain(
        retrieved_ids=retrieved_ids,
        budgeted_ids=budgeted_ids,
        referenced_ids=referenced_ids,
        retrieval_recall=retrieval_recall,
        budget_recall=budget_recall,
        evidence_utilization=utilization,
        evidence_loss_budgeting=loss_budgeting,
        evidence_loss_generation=loss_generation,
    )


# ── Answer evaluator ─────────────────────────────────────────

class AnswerEvaluator:
    """Evaluates answer quality using execution traces and contracts."""

    def __init__(self):
        self.results: list[AnswerResult] = []

    def load_cases(self, path: str | Path | None = None) -> list[dict]:
        if path is None:
            path = Path(__file__).parent / "datasets" / "answer_cases.json"
        with open(path) as f:
            return json.load(f)

    def evaluate(
        self,
        question: str,
        response: str,
        trace: RequestTrace,
        case: dict,
    ) -> AnswerResult:
        """Evaluate a single case against its expected outcome."""
        expected = self._parse_expected(case)
        pipeline = self._check_pipeline(trace, case)
        chain = build_evidence_chain(response, trace, expected)

        correctness = self._eval_correctness(response, trace, expected)
        completeness = self._eval_completeness(response, expected)
        grounding = self._eval_grounding(response, trace, expected)
        clarity = self._eval_clarity(response)

        passed = all([
            correctness.passed,
            completeness.passed,
            grounding.passed,
            clarity.passed,
        ])

        return AnswerResult(
            case_id=case.get("id", ""),
            question=question,
            response=response,
            expected=expected,
            pipeline=pipeline,
            evidence_chain=chain,
            correctness=correctness,
            completeness=completeness,
            grounding=grounding,
            clarity=clarity,
            latency=self._extract_latency(trace),
            passed=passed,
        )

    def _parse_expected(self, case: dict) -> ExpectedOutcome:
        exp = case.get("expected", {})
        exec_data = exp.get("execution", {})
        ans_data = exp.get("answer", {})

        steps = []
        for s in exec_data.get("required_steps", []):
            try:
                steps.append(StepType(s))
            except ValueError:
                pass

        return ExpectedOutcome(
            execution=ExecutionContract(
                required_intent=exec_data.get("required_intent", ""),
                required_steps=steps,
                required_metrics=exec_data.get("required_metrics", []),
                requires_grounding=exec_data.get("requires_grounding", True),
            ),
            answer=AnswerContract(
                requires_numeric=ans_data.get("requires_numeric", False),
                required_information_units=ans_data.get("required_information_units", []),
            ),
        )

    def _check_pipeline(self, trace: RequestTrace, case: dict) -> PipelineCheck:
        intent_span = find_span(trace, Stage.INTENT)
        planner_span = find_span(trace, Stage.PLANNER)

        expected_intent = case.get("expected", {}).get("execution", {}).get("required_intent", "")
        intent_correct = (
            intent_span.attributes.get("intent") == expected_intent
            if intent_span and expected_intent
            else False
        )

        planner_correct = False
        if planner_span:
            step_types = planner_span.attributes.get("step_types", [])
            required = case.get("expected", {}).get("execution", {}).get("required_steps", [])
            if required:
                planner_correct = all(r in step_types for r in required)
            else:
                planner_correct = True

        engine_executed = any(
            s.stage in (Stage.SQL, Stage.RAG)
            for s in trace.spans
        )

        return PipelineCheck(
            intent_correct=intent_correct,
            planner_correct=planner_correct,
            engine_executed=engine_executed,
        )

    def _eval_correctness(self, response: str, trace: RequestTrace, expected: ExpectedOutcome) -> DimensionScore:
        exec_contract = expected.execution

        if StepType.SQL in exec_contract.required_steps:
            sql_span = find_span(trace, Stage.SQL)
            if sql_span and exec_contract.required_metrics:
                actual_value = sql_span.attributes.get("result_content", "")
                if actual_value and not _value_present(response, actual_value):
                    return DimensionScore(0.0, False, "SQL result not reflected in answer")

        if StepType.RAG in exec_contract.required_steps:
            chain = build_evidence_chain(response, trace, expected)
            if chain.retrieved_ids and chain.referenced_count == 0:
                return DimensionScore(0.5, False, "Evidence retrieved but not referenced")

        return DimensionScore(1.0, True, "Answer reflects execution results")

    def _eval_completeness(self, response: str, expected: ExpectedOutcome) -> DimensionScore:
        units = expected.answer.required_information_units
        if not units:
            return DimensionScore(1.0, True, "No specific units required")

        covered = [u for u in units if _unit_covered(response, u)]
        score = len(covered) / len(units)

        if score < 1.0:
            missing = [u for u in units if u not in covered]
            return DimensionScore(score, False, f"Missing: {missing}")

        return DimensionScore(1.0, True, f"All {len(units)} units covered")

    def _eval_grounding(self, response: str, trace: RequestTrace, expected: ExpectedOutcome) -> DimensionScore:
        if not expected.execution.requires_grounding:
            return DimensionScore(1.0, True, "Grounding not required")

        chain = build_evidence_chain(response, trace, expected)

        checks = [
            len(chain.retrieved_ids) > 0,
            len(chain.budgeted_ids) > 0,
            len(chain.referenced_ids) > 0,
        ]

        score = sum(checks) / len(checks)
        if not all(checks):
            reasons = []
            if not chain.retrieved_ids:
                reasons.append("not retrieved")
            if not chain.budgeted_ids:
                reasons.append("not in prompt")
            if not chain.referenced_ids:
                reasons.append("not supported in answer")
            return DimensionScore(score, False, "; ".join(reasons))

        return DimensionScore(1.0, True, "fully grounded")

    def _eval_clarity(self, response: str) -> DimensionScore:
        lines = [l.strip() for l in response.split("\n") if l.strip()]
        checks = [
            len(response.strip()) > 20,
            len(response) < 2000 or any(c in response for c in ["\n", "-", "•"]),
            len(set(lines)) >= max(len(lines) * 0.5, 1),
        ]
        score = sum(checks) / len(checks)
        return DimensionScore(score, score >= 0.66, "clear" if score >= 0.66 else "needs improvement")

    def _extract_latency(self, trace: RequestTrace) -> dict:
        return {
            "planner_ms": trace.stage_latency(Stage.PLANNER),
            "sql_ms": trace.stage_latency(Stage.SQL),
            "retrieval_ms": trace.stage_latency(Stage.RETRIEVAL),
            "prompt_ms": trace.stage_latency(Stage.PROMPT),
            "llm_ms": trace.stage_latency(Stage.LLM),
            "total_ms": trace.total_latency_ms,
        }

    def print_report(self, results: list[AnswerResult]):
        """Print hierarchical evaluation report."""
        total = len(results) or 1
        passed = sum(1 for r in results if r.passed)

        # Aggregate dimension scores
        def avg(fn):
            scores = [fn(r) for r in results]
            return sum(scores) / len(scores) if scores else 0

        print(f"\n{'='*60}")
        print(f"Answer Quality Evaluation: {passed}/{len(results)} passed")
        print(f"{'='*60}")

        print(f"\n{'─'*60}")
        print("Dimensions")
        print(f"{'─'*60}")
        print(f"  Correctness ...... {avg(lambda r: r.correctness.score):.0%}")
        print(f"  Completeness ..... {avg(lambda r: r.completeness.score):.0%}")
        print(f"  Grounding ........ {avg(lambda r: r.grounding.score):.0%}")
        print(f"  Clarity .......... {avg(lambda r: r.clarity.score):.0%}")

        print(f"\n{'─'*60}")
        print("Pipeline")
        print(f"{'─'*60}")
        print(f"  Intent ........... {sum(1 for r in results if r.pipeline.intent_correct)}/{len(results)}")
        print(f"  Planner .......... {sum(1 for r in results if r.pipeline.planner_correct)}/{len(results)}")
        print(f"  Engine ........... {sum(1 for r in results if r.pipeline.engine_executed)}/{len(results)}")

        print(f"\n{'─'*60}")
        print("Per-Case Results")
        print(f"{'─'*60}")
        for r in results:
            status = "PASS" if r.passed else "FAIL"
            print(f"\n  [{status}] {r.case_id}: {r.question}")
            if not r.passed:
                if not r.correctness.passed:
                    print(f"    Correctness: {r.correctness.reason}")
                if not r.completeness.passed:
                    print(f"    Completeness: {r.completeness.reason}")
                if not r.grounding.passed:
                    print(f"    Grounding: {r.grounding.reason}")
                if not r.clarity.passed:
                    print(f"    Clarity: {r.clarity.reason}")
                chain = r.evidence_chain
                print(f"    Evidence: retrieved={chain.retrieved_count}, budgeted={chain.budgeted_count}, referenced={chain.referenced_count}")

        print(f"\n{'='*60}\n")
