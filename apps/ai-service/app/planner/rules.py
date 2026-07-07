from __future__ import annotations

import re
import time
import logging
from dataclasses import dataclass
from typing import Callable

from .models import (
    PlanningRequest, PlanningResult, QueryPlan, ExecutionStep,
    StepType, RagConfig, SqlConfig,
)

logger = logging.getLogger("ai_service.planner")


@dataclass(frozen=True)
class PlanRule:
    """Immutable rule: matcher decides if this rule applies, plan is the result."""
    name: str
    matcher: Callable[[PlanningRequest], bool]
    plan: QueryPlan


class QueryPlanner:
    """Rule engine: evaluates rules in order, returns first match."""

    def __init__(self, rules: list[PlanRule] | None = None):
        self.rules = rules or self._default_rules()

    def plan(self, request: PlanningRequest) -> PlanningResult:
        start = time.monotonic()
        for rule in self.rules:
            if rule.matcher(request):
                elapsed = (time.monotonic() - start) * 1000
                logger.debug(f"Planner: rule '{rule.name}' matched ({elapsed:.2f}ms)")
                return PlanningResult(plan=rule.plan, matched_rule=rule.name, planner_latency_ms=elapsed)
        elapsed = (time.monotonic() - start) * 1000
        logger.debug(f"Planner: default rule ({elapsed:.2f}ms)")
        return PlanningResult(plan=self._default_plan(), matched_rule="default", planner_latency_ms=elapsed)

    def _default_plan(self) -> QueryPlan:
        return QueryPlan(
            steps=[ExecutionStep(type=StepType.RAG, config=RagConfig())],
            template="chat",
        )

    @staticmethod
    def _default_rules() -> list[PlanRule]:
        return [
            # Analytics with journal context → hybrid (SQL + RAG)
            PlanRule(
                name="hybrid",
                matcher=lambda req: (
                    _get_intent(req) == "analytics"
                    and _has_journal_signal(req.query)
                ),
                plan=QueryPlan(
                    steps=[
                        ExecutionStep(type=StepType.SQL, config=SqlConfig(capabilities=["all_stats"])),
                        ExecutionStep(type=StepType.RAG, config=RagConfig(source_types=["journal", "memory"], top_k=5)),
                    ],
                    template="analytics",
                ),
            ),
            # Pure analytics → SQL only
            PlanRule(
                name="analytics_sql",
                matcher=lambda req: _get_intent(req) == "analytics",
                plan=QueryPlan(
                    steps=[ExecutionStep(type=StepType.SQL, config=SqlConfig(capabilities=["all_stats"]))],
                    template="analytics",
                ),
            ),
            # Journal → RAG (journal + memory)
            PlanRule(
                name="journal_rag",
                matcher=lambda req: _get_intent(req) == "journal",
                plan=QueryPlan(
                    steps=[ExecutionStep(type=StepType.RAG, config=RagConfig(source_types=["journal", "memory"], top_k=5))],
                    template="journal",
                ),
            ),
            # Coach → RAG (all sources, deeper retrieval)
            PlanRule(
                name="coach_rag",
                matcher=lambda req: _get_intent(req) == "coach",
                plan=QueryPlan(
                    steps=[ExecutionStep(type=StepType.RAG, config=RagConfig(source_types=["trade", "journal", "memory"], top_k=10))],
                    template="coaching",
                ),
            ),
            # Research → no steps (external tools only)
            PlanRule(
                name="research",
                matcher=lambda req: _get_intent(req) == "research",
                plan=QueryPlan(steps=[], template="research"),
            ),
        ]


def _get_intent(req: PlanningRequest) -> str:
    if hasattr(req.intent, "intent"):
        return req.intent.intent
    return str(req.intent)


def _has_journal_signal(query: str) -> bool:
    """Detect if query references journal/notes content alongside analytics."""
    patterns = [
        r"\b(journal|notes?|wrote|written|learn(?:ed|ing)?|lesson|takeaway)\b",
        r"\b(what\s+did\s+i\s+(write|note|journal))\b",
        r"\b(my\s+(notes?|journal|lessons?))\b",
    ]
    lower = query.lower()
    return any(re.search(p, lower) for p in patterns)
