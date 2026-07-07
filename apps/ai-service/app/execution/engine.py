from __future__ import annotations

import asyncio
import time
import logging
from dataclasses import dataclass, field

from ..planner.models import QueryPlan, ExecutionStep, StepType, RagConfig, SqlConfig
from ..models.common import RetrievedDocument, ToolResult

logger = logging.getLogger("ai_service.execution.engine")


@dataclass(frozen=True)
class EngineResult:
    """Typed result from execution engine. Preserves provenance."""
    sql_results: list[ToolResult] = field(default_factory=list)
    retrieved_docs: list[RetrievedDocument] = field(default_factory=list)
    completed_steps: list[str] = field(default_factory=list)
    total_latency_ms: float = 0.0


class ExecutionEngine:
    """Executes QueryPlan steps in parallel. Returns typed EngineResult."""

    def __init__(self, analytics_service=None, retrieval_pipeline=None):
        self.analytics_service = analytics_service
        self.retrieval = retrieval_pipeline

    async def execute(
        self,
        user_id: str,
        plan: QueryPlan,
        query: str,
        session=None,
    ) -> EngineResult:
        start = time.monotonic()
        tasks = []
        step_labels = []

        for step in plan.steps:
            if step.type == StepType.SQL and self.analytics_service:
                step_labels.append("sql")
                tasks.append(self._run_sql(user_id, step))
            elif step.type == StepType.RAG and self.retrieval:
                step_labels.append("rag")
                tasks.append(self._run_rag(user_id, query, step))
            elif step.type == StepType.MEMORY:
                step_labels.append("memory")
                # Future: memory retrieval
            else:
                logger.debug(f"Skipping step {step.type.value}: no service available")

        completed: list[str] = []
        sql_results: list[ToolResult] = []
        retrieved_docs: list[RetrievedDocument] = []

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for label, result in zip(step_labels, results):
                if isinstance(result, Exception):
                    logger.warning(f"Step '{label}' failed: {result}")
                    continue
                completed.append(label)
                if label == "sql":
                    sql_results.extend(result if isinstance(result, list) else [result])
                elif label == "rag":
                    retrieved_docs.extend(result)

        elapsed_ms = (time.monotonic() - start) * 1000
        logger.debug(f"Engine: {completed} completed ({elapsed_ms:.0f}ms)")

        return EngineResult(
            sql_results=sql_results,
            retrieved_docs=retrieved_docs,
            completed_steps=completed,
            total_latency_ms=elapsed_ms,
        )

    async def _run_sql(self, user_id: str, step: ExecutionStep) -> list[ToolResult]:
        config = step.config
        if not isinstance(config, SqlConfig) or not config.capabilities:
            # Default: get all stats
            result = await self.analytics_service.execute("all_stats", user_id)
            return [result]

        results = []
        for cap in config.capabilities:
            try:
                result = await self.analytics_service.execute(cap, user_id)
                results.append(result)
            except Exception as e:
                logger.warning(f"SQL capability '{cap}' failed: {e}")
        return results

    async def _run_rag(self, user_id: str, query: str, step: ExecutionStep) -> list[RetrievedDocument]:
        from ..retrieval.pipeline import RetrievalOptions
        config = step.config or RagConfig()
        opts = RetrievalOptions(
            top_k=config.top_k,
            min_score=config.min_score,
            source_types=config.source_types,
        )
        result = await self.retrieval.retrieve(user_id, query, opts)
        return result.documents
