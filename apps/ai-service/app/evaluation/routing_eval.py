from __future__ import annotations

import json
import time
import logging
from pathlib import Path
from dataclasses import dataclass, field, asdict

from ..planner.rules import QueryPlanner
from ..planner.models import PlanningRequest, StepType
from ..intent.router import IntentResult
from ..models.common import Complexity, ExecutionMode

logger = logging.getLogger("ai_service.routing_eval")


@dataclass
class CaseResult:
    case_id: str
    question: str
    expected_intent: str
    actual_intent: str
    expected_sql: bool
    expected_rag: bool
    actual_sql: bool
    actual_rag: bool
    matched_rule: str
    intent_correct: bool = False
    routing_correct: bool = False
    passed: bool = False
    latency_ms: float = 0.0


class RoutingEvaluator:
    """Evaluates query planner routing decisions."""

    def __init__(self, query_planner: QueryPlanner | None = None, intent_router=None):
        self.planner = query_planner or QueryPlanner()
        self.intent_router = intent_router
        self.results: list[CaseResult] = []

    def load_cases(self, path: str | Path | None = None) -> list[dict]:
        if path is None:
            path = Path(__file__).parent / "datasets" / "golden_questions.json"
        with open(path) as f:
            return json.load(f)

    def run(self, cases: list[dict] | None = None) -> dict:
        if cases is None:
            cases = self.load_cases()

        results = []
        for item in cases:
            result = self._evaluate_case(item)
            results.append(result)

        passed = sum(1 for r in results if r.passed)
        total = len(results) or 1

        return {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "pass_rate": passed / total,
            "intent_accuracy": sum(1 for r in results if r.intent_correct) / total,
            "routing_accuracy": sum(1 for r in results if r.routing_correct) / total,
            "results": [asdict(r) for r in results],
        }

    def _evaluate_case(self, item: dict) -> CaseResult:
        start = time.monotonic()
        question = item["question"]
        expected_intent = item.get("expected_intent", "")
        expected_sql = item.get("expected_sql", False)
        expected_rag = item.get("expected_rag", True)

        # Classify intent
        if self.intent_router:
            intent_result = self.intent_router.classify(question)
            actual_intent = intent_result.intent
        else:
            actual_intent = expected_intent  # skip intent check
            intent_result = IntentResult(intent=expected_intent, complexity=Complexity.SIMPLE, execution=ExecutionMode.DIRECT)

        # Plan routing
        req = PlanningRequest(query=question, intent=intent_result, session=None)
        plan_result = self.planner.plan(req)
        plan = plan_result.plan

        has_sql = any(s.type == StepType.SQL for s in plan.steps)
        has_rag = any(s.type == StepType.RAG for s in plan.steps)

        intent_correct = actual_intent == expected_intent
        routing_correct = has_sql == expected_sql and has_rag == expected_rag
        elapsed = (time.monotonic() - start) * 1000

        return CaseResult(
            case_id=item["id"],
            question=question,
            expected_intent=expected_intent,
            actual_intent=actual_intent,
            expected_sql=expected_sql,
            expected_rag=expected_rag,
            actual_sql=has_sql,
            actual_rag=has_rag,
            matched_rule=plan_result.matched_rule,
            intent_correct=intent_correct,
            routing_correct=routing_correct,
            passed=intent_correct and routing_correct,
            latency_ms=elapsed,
        )

    def print_report(self, results: dict):
        print(f"\n{'='*60}")
        print(f"Routing Evaluation: {results['passed']}/{results['total']} passed ({results['pass_rate']:.1%})")
        print(f"Intent accuracy:    {results['intent_accuracy']:.1%}")
        print(f"Routing accuracy:   {results['routing_accuracy']:.1%}")
        print(f"{'='*60}")
        for r in results["results"]:
            status = "PASS" if r["passed"] else "FAIL"
            sql_tag = "SQL" if r["actual_sql"] else ""
            rag_tag = "RAG" if r["actual_rag"] else ""
            routing = "+".join(filter(None, [sql_tag, rag_tag])) or "none"
            print(f"[{status}] {r['case_id']}: {r['question']}")
            if not r["passed"]:
                print(f"  Expected: intent={r['expected_intent']} sql={r['expected_sql']} rag={r['expected_rag']}")
                print(f"  Got:      intent={r['actual_intent']} routing={routing} rule={r['matched_rule']}")
        print(f"{'='*60}\n")
