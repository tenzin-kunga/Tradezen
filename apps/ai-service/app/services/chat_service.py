from __future__ import annotations

import logging
import time

from ..config import Config
from ..models import (
    AISession,
    ChatRequest,
    ChatResponse,
    TokenUsage,
)
from ..execution.base import ExecutionResult
from ..models.context import Context
from ..models.common import ExecutionMode
from ..providers.factory import ProviderFactory
from ..routing.model_router import ModelRouter
from .completion_service import CompletionService
from .background_runner import BackgroundTaskRunner
from ..telemetry.tracer import Tracer
from ..telemetry.models import Stage
from ..telemetry.metrics_projector import MetricsProjector

logger = logging.getLogger("ai_service.chat")


class ChatService:
    """Thin dispatcher. classify → plan → engine.execute → prompt → LLM."""

    def __init__(
        self,
        intent_router,
        agent_registry,
        execution_planner,
        model_router: ModelRouter,
        provider_factory: ProviderFactory,
        completion_service: CompletionService,
        config: Config,
        retrieval_pipeline=None,
        memory_manager=None,
        direct_strategy=None,
        tool_strategy=None,
        memory_extractor=None,
        feature_flags=None,
        query_planner=None,
        execution_engine=None,
        traces_repo=None,
    ):
        self.intent_router = intent_router
        self.registry = agent_registry
        self.planner = execution_planner
        self.model_router = model_router
        self.provider_factory = provider_factory
        self.completion = completion_service
        self.config = config
        self.retrieval = retrieval_pipeline
        self.memory_manager = memory_manager
        self.direct_strategy = direct_strategy
        self.tool_strategy = tool_strategy
        self.memory_extractor = memory_extractor
        self.feature_flags = feature_flags
        self.background = BackgroundTaskRunner()
        self.query_planner = query_planner
        self.execution_engine = execution_engine
        self.traces_repo = traces_repo

    async def build_context(self, request: ChatRequest, session: AISession, tracer: Tracer | None = None) -> Context:
        """Shared by handle() and handle_stream(). Returns immutable Context."""
        query = request.messages[-1].content if request.messages else ""
        session.user_id = request.user_id

        # Slice 7: NestJS owns orchestration + final context. Passthrough —
        # the conversation already contains the NestJS-assembled system prompt
        # (persona + retrieved docs + memories). Skip autonomous RAG entirely.
        if request.context_owned:
            provider_name, model = self.model_router.select(requested_model=request.model)
            provider = self.provider_factory.get(provider_name)
            session.provider = provider
            session.provider_name = provider_name
            session.model = model
            session.metrics.provider = provider_name
            session.metrics.model = model
            conversation = [{"role": m.role, "content": m.content} for m in request.messages]
            return Context(
                user_id=request.user_id,
                query=query,
                messages=conversation,
                intent=None,
                model=model,
                provider=provider,
                temperature=request.temperature or session.temperature or 0.4,
                request_id=session.request_id,
                context_owned=True,
            )

        # 1. Classify intent
        h = tracer.begin(Stage.INTENT) if tracer else None
        intent_result = self.intent_router.classify(query)
        if tracer and h:
            tracer.finish(h, {"intent": intent_result.intent, "confidence": intent_result.confidence, "signal_count": len(intent_result.signals or [])})
        session.intent = intent_result
        session.metrics.intent = intent_result.intent
        session.metrics.intent_confidence = intent_result.confidence

        # 2. Route to provider
        from ..models.intent import IntentType
        try:
            intent_type = IntentType(intent_result.intent)
        except ValueError:
            intent_type = IntentType.GENERAL
        provider_name, model = self.model_router.select(intent=intent_type, requested_model=request.model)
        provider = self.provider_factory.get(provider_name)
        session.provider = provider
        session.provider_name = provider_name
        session.model = model
        session.metrics.provider = provider_name
        session.metrics.model = model

        # 3. Plan execution via QueryPlanner
        plan_result = None
        if self.query_planner:
            from ..planner.models import PlanningRequest
            h = tracer.begin(Stage.PLANNER) if tracer else None
            planning_req = PlanningRequest(query=query, intent=intent_result, session=session)
            plan_result = self.query_planner.plan(planning_req)
            if tracer and h:
                tracer.finish(h, {"rule": plan_result.matched_rule, "step_count": len(plan_result.plan.steps), "step_types": [s.type.value for s in plan_result.plan.steps]})
            session.metrics.planner_rule = plan_result.matched_rule

        # 4. Execute via ExecutionEngine
        sql_results = []
        retrieved_docs = []
        completed_steps = []
        if self.execution_engine and plan_result:
            from ..execution.engine import EngineResult
            # Trace each step type
            for step in plan_result.plan.steps:
                stage = Stage.SQL if step.type.value == "sql" else Stage.RAG
                h = tracer.begin(stage) if tracer else None
            engine_result = await self.execution_engine.execute(
                user_id=request.user_id,
                plan=plan_result.plan,
                query=query,
                session=session,
            )
            sql_results = engine_result.sql_results
            retrieved_docs = engine_result.retrieved_docs
            completed_steps = engine_result.completed_steps
            # Finish step spans with results
            if tracer:
                for step in plan_result.plan.steps:
                    stage = Stage.SQL if step.type.value == "sql" else Stage.RAG
                    count = len(sql_results) if step.type.value == "sql" else len(retrieved_docs)
                    # The span was already created above; we just need to finish the last ones
                # Since we can't easily track which handle corresponds to which step,
                # we'll create summary spans instead
            session.metrics.retrieved_docs = len(retrieved_docs)
            session.metrics.completed_steps = completed_steps
        elif self.retrieval and self.feature_flags and self.feature_flags.is_enabled("rag"):
            # Fallback: direct retrieval (no planner)
            h = tracer.begin(Stage.RETRIEVAL) if tracer else None
            try:
                from ..retrieval.pipeline import RetrievalOptions
                result = await self.retrieval.retrieve(
                    user_id=request.user_id,
                    query=query,
                    options=RetrievalOptions(top_k=5),
                )
                retrieved_docs = result.documents
                session.metrics.retrieved_docs = len(retrieved_docs)
                if tracer and h:
                    tracer.finish(h, {"doc_count": len(retrieved_docs), "strategy": "vector-only"})
            except Exception as e:
                logger.warning(f"Retrieval failed: {e}")
                if tracer and h:
                    tracer.finish(h, {"error": str(e)})

        # 5. Load memories
        memories = []
        if self.feature_flags and self.feature_flags.is_enabled("memory") and self.memory_manager:
            try:
                memories = await self.memory_manager.get_user_memories(request.user_id)
            except Exception as e:
                logger.warning(f"Memory load failed: {e}")

        # 6. Build conversation messages
        conversation = [{"role": m.role, "content": m.content} for m in request.messages]

        # 7. Build messages via PromptBuilder
        messages = conversation
        h_prompt = tracer.begin(Stage.PROMPT) if tracer else None
        try:
            from ..prompts.builder import PromptBuilder
            # Use plan template if available, fallback to intent-based
            # ponytail: template_loader appends .md, so names here omit it
            template_name = "chat"
            if plan_result and plan_result.plan.template:
                template_name = plan_result.plan.template
            else:
                intent_name = intent_result.intent
                template_map = {
                    "analytics": "analytics",
                    "coach": "coaching",
                    "journal": "journal",
                    "research": "research",
                }
                template_name = template_map.get(intent_name, "chat")

            if not hasattr(self, "_prompt_builder"):
                self._prompt_builder = PromptBuilder()

            # Pass sql_results as tool_results for prompt rendering
            tool_results_for_prompt = sql_results if sql_results else None
            messages = self._prompt_builder.build(
                template_name, conversation, retrieved_docs, memories, tool_results_for_prompt,
            )
            if tracer and h_prompt:
                tracer.finish(h_prompt, {"template": template_name, "section_count": len([s for s in [retrieved_docs, memories, sql_results] if s])})
        except Exception as e:
            logger.warning(f"Prompt build failed, using raw conversation: {e}")
            if tracer and h_prompt:
                tracer.finish(h_prompt, {"error": str(e)})

        plan_obj = plan_result.plan if plan_result else None
        return Context(
            user_id=request.user_id,
            query=query,
            messages=messages,
            intent=intent_result,
            retrieved_docs=retrieved_docs,
            memories=memories,
            model=model,
            provider=provider,
            temperature=request.temperature or session.temperature or 0.4,
            request_id=session.request_id,
            plan=plan_obj,
            sql_results=sql_results,
            completed_steps=completed_steps,
        )

    async def handle(self, request: ChatRequest, session: AISession, api_key: str | None = None, base_url: str | None = None) -> ChatResponse:
        # Request-scoped tracer
        tracer = Tracer()
        tracer.start_request()

        ctx = await self.build_context(request, session, tracer=tracer)

        # LLM generation
        h_llm = tracer.begin(Stage.LLM)
        if ctx.context_owned:
            # Slice 7 passthrough: no agent/strategy (they would re-wrap the
            # prompt with TradeZen persona). Send the conversation verbatim.
            raw = await self.completion.complete(session, ctx.messages)
            result = ExecutionResult(
                content=raw.get("content", ""),
                usage=raw.get("usage", {}),
            )
            tracer.finish(h_llm, {"model": session.model, "provider": session.metrics.provider, "tokens_out": result.usage.get("completion_tokens", 0), "passthrough": True})
            # Build trace and save
            trace = tracer.build_trace(session.request_id, session.trace_id, ctx.user_id, ctx.query)
            if self.traces_repo:
                await self.traces_repo.save(trace)
            session.metrics = MetricsProjector.to_session_metrics(trace)
            session.metrics.latency_ms = trace.total_latency_ms
            return ChatResponse(
                content=result.content,
                model=session.model,
                usage=TokenUsage(
                    prompt_tokens=result.usage.get("prompt_tokens", 0),
                    completion_tokens=result.usage.get("completion_tokens", 0),
                    total_tokens=result.usage.get("prompt_tokens", 0) + result.usage.get("completion_tokens", 0),
                ),
                request_id=session.request_id,
                metadata={
                    "provider": session.metrics.provider,
                    "model": session.model,
                    "total_latency_ms": trace.total_latency_ms,
                    "intent": "passthrough",
                    "context_owned": True,
                },
            )

        strategy = self.direct_strategy
        if ctx.intent and ctx.intent.execution == ExecutionMode.TOOL and self.tool_strategy:
            strategy = self.tool_strategy

        agent = self.registry.get(ctx.intent.intent if ctx.intent else "general")
        result = await agent.execute(
            user_id=ctx.user_id,
            query=ctx.query,
            conversation=ctx.messages,
            session=session,
            strategy=strategy,
        )
        tracer.finish(h_llm, {"model": session.model, "provider": session.metrics.provider, "tokens_out": result.usage.get("completion_tokens", 0)})

        # Normalize token usage from provider
        raw_usage = result.usage
        usage = TokenUsage(
            prompt_tokens=raw_usage.get("prompt_tokens", 0),
            completion_tokens=raw_usage.get("completion_tokens", 0),
            total_tokens=raw_usage.get("prompt_tokens", 0) + raw_usage.get("completion_tokens", 0),
        )

        # Background memory extraction
        if self.memory_extractor and self.feature_flags and self.feature_flags.is_enabled("memory"):
            h_bg = tracer.begin(Stage.BACKGROUND)
            self.background.run(
                self.memory_extractor.extract_and_store(ctx.user_id, ctx.query, result.content, wait=False),
                name="memory-extraction",
            )
            tracer.finish(h_bg, {"task": "memory-extraction"})

        # Build trace and save
        trace = tracer.build_trace(session.request_id, session.trace_id, ctx.user_id, ctx.query)
        if self.traces_repo:
            await self.traces_repo.save(trace)

        # Derive metrics from trace
        session.metrics = MetricsProjector.to_session_metrics(trace)
        session.metrics.latency_ms = trace.total_latency_ms

        return ChatResponse(
            content=result.content,
            model=session.model,
            usage=usage,
            request_id=session.request_id,
            metadata={
                "provider": session.metrics.provider,
                "model": session.model,
                "total_latency_ms": trace.total_latency_ms,
                "planner_ms": session.metrics.planner_ms,
                "sql_ms": session.metrics.sql_ms,
                "retrieval_ms": session.metrics.retrieval_ms,
                "prompt_build_ms": session.metrics.prompt_build_ms,
                "generation_ms": session.metrics.generation_ms,
                "intent": ctx.intent.intent if ctx.intent else "unknown",
                "intent_confidence": ctx.intent.confidence if ctx.intent else 0,
                "retrieved_docs": len(ctx.retrieved_docs),
                "memory_hits": result.memory_hits,
                "tool_calls": result.tool_calls,
                "execution_mode": ctx.intent.execution.value if ctx.intent else "direct",
                "planner_rule": session.metrics.planner_rule,
                "completed_steps": ctx.completed_steps,
            },
        )

    async def handle_stream(self, request: ChatRequest, session: AISession, api_key: str | None = None, base_url: str | None = None):
        """Streaming variant. Same pipeline as handle(), yields tokens."""
        tracer = Tracer()
        tracer.start_request()

        ctx = await self.build_context(request, session, tracer=tracer)
        session.stream = True

        h_llm = tracer.begin(Stage.LLM)
        async for token in self.completion.stream(session, ctx.messages, api_key=api_key, base_url=base_url):
            yield token
        tracer.finish(h_llm, {"model": session.model, "streaming": True})

        # Build trace and save
        trace = tracer.build_trace(session.request_id, session.trace_id, ctx.user_id, ctx.query)
        if self.traces_repo:
            await self.traces_repo.save(trace)
        session.metrics = MetricsProjector.to_session_metrics(trace)

        # Background memory extraction after stream completes
        if self.memory_extractor and self.feature_flags and self.feature_flags.is_enabled("memory"):
            full_response = getattr(session, "_full_response", "")
            if full_response:
                self.background.run(
                    self.memory_extractor.extract_and_store(ctx.user_id, ctx.query, full_response, wait=False),
                    name="memory-extraction-stream",
                )
