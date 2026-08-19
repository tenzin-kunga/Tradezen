from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from ..intent.router import IntentRouter
from ..planner.rules import QueryPlanner
from .routing_eval import RoutingEvaluator
from .retrieval_eval import RetrievalEvaluator
from .answer_eval import AnswerEvaluator

logger = logging.getLogger("ai_service.evaluation")


class EvaluationRunner:
    """Unified evaluation runner: Intent → Routing → Retrieval."""

    def __init__(
        self,
        intent_router: IntentRouter | None = None,
        query_planner: QueryPlanner | None = None,
        retrieval_pipeline=None,
        chat_service=None,
    ):
        self.intent_router = intent_router or IntentRouter()
        self.query_planner = query_planner or QueryPlanner()
        self.retrieval_pipeline = retrieval_pipeline
        self.chat_service = chat_service

    def load_dataset(self, path: str | Path | None = None) -> list[dict]:
        if path is None:
            path = Path(__file__).parent / "datasets" / "golden_questions.json"
        with open(path) as f:
            return json.load(f)

    async def run_all(self, user_id: str | None = None) -> dict:
        """Run all evaluation stages."""
        dataset = self.load_dataset()

        intent_results = self._run_intent(dataset)
        routing_results = self._run_routing(dataset)

        retrieval_results = {"total": 0, "passed": 0, "summary": {}}
        if self.retrieval_pipeline and user_id:
            try:
                evaluator = RetrievalEvaluator(self.retrieval_pipeline)
                retrieval_results = await evaluator.run(user_id)
            except Exception as e:
                logger.warning(f"Retrieval eval failed: {e}")

        answer_results = {"total": 0, "passed": 0, "summary": {}}
        if self.chat_service:
            try:
                evaluator = AnswerEvaluator()
                answer_results = await self._run_answer(evaluator)
            except Exception as e:
                logger.warning(f"Answer eval failed: {e}")

        return {
            "intent": intent_results,
            "routing": routing_results,
            "retrieval": retrieval_results,
            "answer": answer_results,
            "summary": {
                "total_intent": intent_results.get("total", 0),
                "passed_intent": intent_results.get("passed", 0),
                "total_routing": routing_results.get("total", 0),
                "passed_routing": routing_results.get("passed", 0),
                "intent_pass_rate": intent_results.get("pass_rate", 0),
                "routing_pass_rate": routing_results.get("pass_rate", 0),
                "answer_pass_rate": answer_results.get("pass_rate", 0),
            },
        }

    def _run_intent(self, dataset: list[dict]) -> dict:
        """Intent classification evaluation."""
        results = []
        for item in dataset:
            result = self._evaluate_intent(item)
            results.append(result)

        passed = sum(1 for r in results if r["passed"])
        total = len(results) or 1
        return {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "pass_rate": passed / total,
            "results": results,
        }

    def _evaluate_intent(self, item: dict) -> dict:
        start = time.monotonic()
        question = item["question"]
        expected_intent = item.get("expected_intent", "")

        intent_result = self.intent_router.classify(question)
        intent_correct = intent_result.intent == expected_intent

        elapsed = (time.monotonic() - start) * 1000
        return {
            "id": item["id"],
            "question": question,
            "expected_intent": expected_intent,
            "actual_intent": intent_result.intent,
            "intent_correct": intent_correct,
            "passed": intent_correct,
            "latency_ms": elapsed,
        }

    def _run_routing(self, dataset: list[dict]) -> dict:
        """Query planner routing evaluation."""
        evaluator = RoutingEvaluator(self.query_planner, self.intent_router)
        return evaluator.run(dataset)

    async def _run_answer(self, evaluator: AnswerEvaluator) -> dict:
        """Answer quality evaluation using chat service."""
        from ..models import ChatRequest, Context, AISession

        cases = evaluator.load_cases()
        results = []

        for case in cases:
            try:
                request = ChatRequest(
                    message=case["question"],
                    user_id="eval_user",
                )
                session = AISession(
                    request_id=f"eval_{case['id']}",
                    user_id="eval_user",
                )
                response = await self.chat_service.handle(request, session)

                result = evaluator.evaluate(
                    question=case["question"],
                    response=response.content,
                    trace=session.trace,
                    case=case,
                )
                results.append(result)
            except Exception as e:
                logger.warning(f"Answer eval case {case['id']} failed: {e}")

        evaluator.results = results
        passed = sum(1 for r in results if r.passed)
        total = len(results) or 1

        return {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
            "pass_rate": passed / total,
            "results": [
                {
                    "id": r.case_id,
                    "question": r.question,
                    "passed": r.passed,
                    "correctness": r.correctness.score,
                    "completeness": r.completeness.score,
                    "grounding": r.grounding.score,
                    "clarity": r.clarity.score,
                }
                for r in results
            ],
        }

    def print_report(self, results: dict):
        print(f"\n{'='*60}")
        print("TradeZen AI Evaluation Report")
        print(f"{'='*60}")

        # Intent
        intent = results.get("intent", {})
        print(f"\nIntent Classification: {intent.get('passed', 0)}/{intent.get('total', 0)} ({intent.get('pass_rate', 0):.1%})")
        for r in intent.get("results", []):
            if not r["passed"]:
                print(f"  [FAIL] {r['id']}: expected={r['expected_intent']}, got={r['actual_intent']}")

        # Routing
        routing = results.get("routing", {})
        print(f"\nQuery Routing: {routing.get('passed', 0)}/{routing.get('total', 0)} ({routing.get('pass_rate', 0):.1%})")
        print(f"  Intent accuracy:  {routing.get('intent_accuracy', 0):.1%}")
        print(f"  Routing accuracy: {routing.get('routing_accuracy', 0):.1%}")

        # Retrieval
        retrieval = results.get("retrieval", {})
        if retrieval.get("total", 0) > 0:
            summary = retrieval.get("summary", {})
            print(f"\nRetrieval: {retrieval.get('passed', 0)}/{retrieval.get('total', 0)}")
            print(f"  Precision@5: {summary.get('precision_at_5', 0):.3f}")
            print(f"  Recall@5:    {summary.get('recall_at_5', 0):.3f}")
            print(f"  MRR:         {summary.get('mrr', 0):.3f}")

        # Answer
        answer = results.get("answer", {})
        if answer.get("total", 0) > 0:
            print(f"\nAnswer Quality: {answer.get('passed', 0)}/{answer.get('total', 0)} ({answer.get('pass_rate', 0):.1%})")
            for r in answer.get("results", []):
                status = "PASS" if r["passed"] else "FAIL"
                if not r["passed"]:
                    print(f"  [{status}] {r['id']}: {r['question']}")
                    if r["correctness"] < 1.0:
                        print(f"    Correctness: {r['correctness']:.0%}")
                    if r["completeness"] < 1.0:
                        print(f"    Completeness: {r['completeness']:.0%}")
                    if r["grounding"] < 1.0:
                        print(f"    Grounding: {r['grounding']:.0%}")

        print(f"\n{'='*60}\n")


if __name__ == "__main__":
    import asyncio
    runner = EvaluationRunner()
    results = asyncio.run(runner.run_all())
    runner.print_report(results)
    exit(0 if results["summary"]["passed_intent"] == results["summary"]["total_intent"] else 1)
