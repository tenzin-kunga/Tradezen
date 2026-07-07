from __future__ import annotations

import json
import time
import logging
from pathlib import Path
from dataclasses import dataclass, field, asdict

logger = logging.getLogger("ai_service.retrieval_eval")


@dataclass
class CaseResult:
    case_id: str
    question: str
    relevant_ids: list[str]
    retrieved_ids: list[str]
    retrieved_types: list[str]
    expected_type: str

    # Metrics
    precision_at_k: float = 0.0
    recall_at_k: float = 0.0
    mrr: float = 0.0
    budget_recall: float = 0.0
    has_content: bool = False

    # Latency breakdown
    latency_ms: float = 0.0
    vector_ms: float = 0.0
    keyword_ms: float = 0.0
    rrf_ms: float = 0.0
    budget_ms: float = 0.0

    passed: bool = False


@dataclass
class EvalSummary:
    total: int = 0
    passed: int = 0
    failed: int = 0
    pass_rate: float = 0.0

    precision_at_5: float = 0.0
    recall_at_5: float = 0.0
    mrr: float = 0.0
    budget_recall: float = 0.0
    content_coverage: float = 0.0

    avg_latency_ms: float = 0.0
    avg_vector_ms: float = 0.0
    avg_keyword_ms: float = 0.0
    avg_rrf_ms: float = 0.0
    avg_budget_ms: float = 0.0

    avg_retrieved_docs: float = 0.0
    avg_relevant_retained: float = 0.0


class RetrievalEvaluator:
    """Evaluates retrieval quality with Precision@k, Recall@k, MRR, Budget Recall."""

    def __init__(self, retrieval_pipeline=None):
        self.retrieval = retrieval_pipeline

    def load_cases(self, path: str | Path | None = None) -> list[dict]:
        if path is None:
            path = Path(__file__).parent / "datasets" / "retrieval_cases.json"
        with open(path) as f:
            return json.load(f)

    async def run(self, user_id: str, cases: list[dict] | None = None) -> dict:
        if cases is None:
            cases = self.load_cases()
        if not self.retrieval:
            return {"error": "No retrieval pipeline configured", "total": 0, "passed": 0}

        results = []
        for case in cases:
            result = await self._evaluate_case(user_id, case)
            results.append(result)

        summary = self._aggregate(results)
        return {
            "summary": asdict(summary),
            "results": [asdict(r) for r in results],
        }

    async def _evaluate_case(self, user_id: str, case: dict) -> CaseResult:
        relevant_ids = set(case.get("relevant_document_ids", []))
        expected_type = case.get("expected_source_type", "")

        start = time.monotonic()
        vector_ms = keyword_ms = rrf_ms = budget_ms = 0.0

        try:
            from ..retrieval.pipeline import RetrievalOptions
            result = await self.retrieval.retrieve(
                user_id=user_id,
                query=case["question"],
                options=RetrievalOptions(top_k=5),
            )
            docs = result.documents
            # Extract per-stage latency if available
            latency_breakdown = getattr(result, "latency_breakdown", {})
            vector_ms = latency_breakdown.get("vector", 0.0)
            keyword_ms = latency_breakdown.get("keyword", 0.0)
            rrf_ms = latency_breakdown.get("rrf", 0.0)
            budget_ms = latency_breakdown.get("budget", 0.0)
        except Exception as e:
            logger.warning(f"Retrieval failed for {case['id']}: {e}")
            docs = []

        elapsed_ms = (time.monotonic() - start) * 1000

        retrieved_ids = [d.document_id for d in docs]
        retrieved_types = [d.source_type for d in docs]
        has_content = any(d.content for d in docs)

        # Precision@k
        k = len(retrieved_ids) or 1
        relevant_retrieved = len(set(retrieved_ids) & relevant_ids)
        precision = relevant_retrieved / k if k > 0 else 0.0

        # Recall@k
        total_relevant = len(relevant_ids) or 1
        recall = relevant_retrieved / total_relevant if total_relevant > 0 else 0.0

        # MRR (reciprocal rank of first relevant document)
        mrr = 0.0
        for i, doc_id in enumerate(retrieved_ids):
            if doc_id in relevant_ids:
                mrr = 1.0 / (i + 1)
                break

        # Budget Recall (all retrieved docs have content = survived budgeting)
        relevant_retained = sum(1 for doc_id in retrieved_ids if doc_id in relevant_ids and has_content)
        budget_recall = relevant_retained / total_relevant if total_relevant > 0 else 0.0

        # Type check
        type_correct = expected_type in retrieved_types if expected_type else True

        return CaseResult(
            case_id=case["id"],
            question=case["question"],
            relevant_ids=list(relevant_ids),
            retrieved_ids=retrieved_ids,
            retrieved_types=retrieved_types,
            expected_type=expected_type,
            precision_at_k=precision,
            recall_at_k=recall,
            mrr=mrr,
            budget_recall=budget_recall,
            has_content=has_content,
            latency_ms=elapsed_ms,
            vector_ms=vector_ms,
            keyword_ms=keyword_ms,
            rrf_ms=rrf_ms,
            budget_ms=budget_ms,
            passed=type_correct and has_content and recall > 0,
        )

    def _aggregate(self, results: list[CaseResult]) -> EvalSummary:
        n = len(results) or 1
        return EvalSummary(
            total=len(results),
            passed=sum(1 for r in results if r.passed),
            failed=sum(1 for r in results if not r.passed),
            pass_rate=sum(1 for r in results if r.passed) / n,
            precision_at_5=sum(r.precision_at_k for r in results) / n,
            recall_at_5=sum(r.recall_at_k for r in results) / n,
            mrr=sum(r.mrr for r in results) / n,
            budget_recall=sum(r.budget_recall for r in results) / n,
            content_coverage=sum(1 for r in results if r.has_content) / n,
            avg_latency_ms=sum(r.latency_ms for r in results) / n,
            avg_vector_ms=sum(r.vector_ms for r in results) / n,
            avg_keyword_ms=sum(r.keyword_ms for r in results) / n,
            avg_rrf_ms=sum(r.rrf_ms for r in results) / n,
            avg_budget_ms=sum(r.budget_ms for r in results) / n,
            avg_retrieved_docs=sum(len(r.retrieved_ids) for r in results) / n,
            avg_relevant_retained=sum(
                len(set(r.retrieved_ids) & set(r.relevant_ids)) for r in results
            ) / n,
        )

    def print_report(self, data: dict):
        s = data["summary"]
        print(f"\n{'='*60}")
        print(f"Retrieval Evaluation: {s['passed']}/{s['total']} passed ({s['pass_rate']:.1%})")
        print(f"{'='*60}")
        print(f"Precision@5:    {s['precision_at_5']:.3f}")
        print(f"Recall@5:       {s['recall_at_5']:.3f}")
        print(f"MRR:            {s['mrr']:.3f}")
        print(f"Budget Recall:  {s['budget_recall']:.3f}")
        print(f"Content:        {s['content_coverage']:.1%}")
        print(f"{'─'*60}")
        print(f"Avg latency:    {s['avg_latency_ms']:.0f}ms")
        print(f"  Vector:       {s['avg_vector_ms']:.0f}ms")
        print(f"  Keyword:      {s['avg_keyword_ms']:.0f}ms")
        print(f"  RRF:          {s['avg_rrf_ms']:.0f}ms")
        print(f"  Budget:       {s['avg_budget_ms']:.0f}ms")
        print(f"{'─'*60}")
        print(f"Avg retrieved:  {s['avg_retrieved_docs']:.1f} docs")
        print(f"Avg relevant:   {s['avg_relevant_retained']:.1f} retained")
        print(f"{'='*60}")

        for r in data["results"]:
            status = "PASS" if r["passed"] else "FAIL"
            print(f"[{status}] {r['case_id']}: {r['question']}")
            if not r["passed"]:
                print(f"  P={r['precision_at_k']:.2f} R={r['recall_at_k']:.2f} MRR={r['mrr']:.2f}")
        print()

    def save_results(self, data: dict, tag: str, output_dir: str | Path | None = None):
        if output_dir is None:
            output_dir = Path(__file__).parent / "eval_results"
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        path = output_dir / f"{tag}.json"
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved eval results to {path}")
        return path


def compare_reports(baseline: dict, hybrid: dict) -> str:
    """Generate Markdown comparison between two eval runs."""
    b = baseline["summary"]
    h = hybrid["summary"]

    def delta(new: float, old: float) -> str:
        if old == 0:
            return "N/A"
        pct = ((new - old) / old) * 100
        sign = "+" if pct >= 0 else ""
        return f"{sign}{pct:.1f}%"

    lines = [
        "# Retrieval Comparison",
        "",
        "## Summary",
        "",
        "| Metric | Baseline | Hybrid | Delta |",
        "|--------|----------|--------|-------|",
        f"| Precision@5 | {b['precision_at_5']:.3f} | {h['precision_at_5']:.3f} | {delta(h['precision_at_5'], b['precision_at_5'])} |",
        f"| Recall@5 | {b['recall_at_5']:.3f} | {h['recall_at_5']:.3f} | {delta(h['recall_at_5'], b['recall_at_5'])} |",
        f"| MRR | {b['mrr']:.3f} | {h['mrr']:.3f} | {delta(h['mrr'], b['mrr'])} |",
        f"| Budget Recall | {b['budget_recall']:.3f} | {h['budget_recall']:.3f} | {delta(h['budget_recall'], b['budget_recall'])} |",
        f"| Content Coverage | {b['content_coverage']:.1%} | {h['content_coverage']:.1%} | {delta(h['content_coverage'], b['content_coverage'])} |",
        "",
        "## Latency",
        "",
        "| Stage | Baseline (ms) | Hybrid (ms) | Delta |",
        "|-------|---------------|-------------|-------|",
        f"| Vector | {b['avg_vector_ms']:.0f} | {h['avg_vector_ms']:.0f} | {delta(h['avg_vector_ms'], b['avg_vector_ms'])} |",
        f"| Keyword | {b['avg_keyword_ms']:.0f} | {h['avg_keyword_ms']:.0f} | {delta(h['avg_keyword_ms'], b['avg_keyword_ms'])} |",
        f"| RRF | {b['avg_rrf_ms']:.0f} | {h['avg_rrf_ms']:.0f} | {delta(h['avg_rrf_ms'], b['avg_rrf_ms'])} |",
        f"| Budget | {b['avg_budget_ms']:.0f} | {h['avg_budget_ms']:.0f} | {delta(h['avg_budget_ms'], b['avg_budget_ms'])} |",
        f"| **Total** | **{b['avg_latency_ms']:.0f}** | **{h['avg_latency_ms']:.0f}** | **{delta(h['avg_latency_ms'], b['avg_latency_ms'])}** |",
        "",
        "## Per-Case Results",
        "",
        "| Case | Question | Baseline P/R/MRR | Hybrid P/R/MRR |",
        "|------|----------|------------------|----------------|",
    ]

    b_cases = {r["case_id"]: r for r in baseline["results"]}
    h_cases = {r["case_id"]: r for r in hybrid["results"]}

    for case_id in b_cases:
        br = b_cases.get(case_id, {})
        hr = h_cases.get(case_id, {})
        q = br.get("question", hr.get("question", ""))[:40]
        bp = f"{br.get('precision_at_k', 0):.2f}/{br.get('recall_at_k', 0):.2f}/{br.get('mrr', 0):.2f}"
        hp = f"{hr.get('precision_at_k', 0):.2f}/{hr.get('recall_at_k', 0):.2f}/{hr.get('mrr', 0):.2f}"
        lines.append(f"| {case_id} | {q} | {bp} | {hp} |")

    lines.append("")
    return "\n".join(lines)
