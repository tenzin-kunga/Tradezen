from __future__ import annotations

import logging
import time

from .base import ExecutionResult

logger = logging.getLogger("ai_service.execution.direct")


class DirectExecutionStrategy:
    """Single LLM call with pre-fetched context. Lowest latency."""

    def __init__(self, retrieval_pipeline, retrieval_policy, prompt_builder, completion_service):
        self.retrieval = retrieval_pipeline
        self.policy = retrieval_policy
        self.prompt_builder = prompt_builder
        self.completion = completion_service

    async def execute(
        self, user_id: str, query: str, conversation: list[dict], session,
    ) -> ExecutionResult:
        start = time.monotonic()

        # Retrieve context
        retrieved_docs = []
        if self.retrieval and session.intent:
            intent = session.intent.name if hasattr(session.intent, "name") else str(session.intent)
            pol = self.policy.get_policy(intent) if hasattr(self.policy, "get_policy") else {"top_k": 3}
            try:
                from ..retrieval.pipeline import RetrievalOptions
                opts = RetrievalOptions(top_k=pol.get("top_k", 3))
                result = await self.retrieval.retrieve(user_id, query, opts)
                retrieved_docs = result.documents
            except Exception as e:
                logger.warning(f"Retrieval failed: {e}")

        # Build prompt
        template = self._template_for_intent(session.intent)
        messages = self.prompt_builder.build(
            template_name=template,
            messages=conversation,
            retrieved_docs=retrieved_docs,
        )

        # Call LLM
        result = await self.completion.complete(session, messages)
        elapsed = (time.monotonic() - start) * 1000

        return ExecutionResult(
            content=result["content"],
            retrieved_docs=len(retrieved_docs),
            latency_ms=elapsed,
            usage=result.get("usage", {}),
        )

    def _template_for_intent(self, intent) -> str:
        if hasattr(intent, "name"):
            name = intent.name
        else:
            name = str(intent)
        return {"analytics": "analytics", "coach": "coaching", "journal": "journal", "research": "research"}.get(name, "chat")
