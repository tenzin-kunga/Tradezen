from __future__ import annotations

import asyncio
import logging

from .cache.manager import CacheManager
from .config import Config
from .database.connection import Database
from .events.bus import EventBus
from .features.registry import FeatureRegistry
from .providers.budget import CostProtector
from .providers.factory import ProviderFactory
from .providers.health import ProviderHealthManager
from .routing.model_router import ModelRouter
from .security.auth import AuthService
from .security.concurrency import ConcurrencyLimiter
from .security.circuit_breaker import CircuitBreaker
from .security.rate_limiter import MemoryRateLimiter, parse_rate_limit
from .security.retry import RetryPolicy
from .security.validation.message import MessageValidator, PromptValidator
from .security.validation.pipeline import ValidationPipeline
from .services.chat_service import ChatService
from .services.completion_service import CompletionService
from .telemetry.collector import TelemetryCollector
from .telemetry.memory_store import InMemoryTracesStore

from .embeddings.provider import OllamaEmbeddingProvider, OpenAIEmbeddingProvider
from .embeddings.service import EmbeddingService
from .repositories.document_repository import DocumentRepository
from .repositories.vector_repository import VectorRepository
from .repositories.trade_repository import TradeRepository
from .repositories.journal_repository import JournalRepository
from .repositories.memory_repository import MemoryRepository
from .retrieval.pipeline import RetrievalPipeline
from .retrieval.stages.embedding import QueryEmbeddingStage
from .retrieval.stages.vector import VectorSearchStage
from .retrieval.stages.keyword import KeywordSearchStage
from .retrieval.stages.rrf import RRFFusionStage
from .retrieval.stages.filtering import FilteringStage
from .retrieval.stages.budget import BudgetAllocationStage
from .retrieval.policies import RetrievalPolicy
from .intent.router import IntentRouter
from .prompts.builder import PromptBuilder
from .tools.analytics import AnalyticsTool
from .tools.sql import SQLTool
from .memory.manager import MemoryManager
from .memory.extractor import MemoryExtractor
from .services.ingestion_service import IngestionService

from .agents.registry import AgentRegistry
from .agents.direct import DirectAgent
from .agents.graph_agent import CoachAgent, JournalAgent, ResearchAgent
from .execution.direct import DirectExecutionStrategy
from .execution.tool import ToolExecutionStrategy
from .execution.planner import ExecutionPlanner
from .execution.engine import ExecutionEngine
from .planner.rules import QueryPlanner
from .services.analytics_service import AnalyticsService

logger = logging.getLogger("ai_service.container")


class Container:
    def __init__(self, config: Config):
        self.config = config

        # Infrastructure
        self.cache = CacheManager(ttl_seconds=300)
        self.events = EventBus()
        self.telemetry = TelemetryCollector()
        self.traces_store = InMemoryTracesStore()
        self.feature_flags = FeatureRegistry(
            rag=config.enable_rag, memory=config.enable_memory,
            tools=config.enable_tools, streaming=config.enable_streaming,
            cache=config.enable_cache,
        )

        self.provider_factory = ProviderFactory(config)
        self.provider_health = ProviderHealthManager()
        self.cost_protector = CostProtector(config.daily_cost_budget)

        self.model_router = ModelRouter(self.provider_factory, self.provider_health, config)

        self.auth = AuthService(secret=config.auth_secret, nestjs_key=config.nestjs_internal_api_key)
        self.rate_limiter = MemoryRateLimiter()
        self.rate_limits = {
            "chat": parse_rate_limit(config.chat_rate_limit),
            "research": parse_rate_limit(config.research_rate_limit),
            "coaching": parse_rate_limit(config.coaching_rate_limit),
            "embedding": parse_rate_limit(config.embedding_rate_limit),
        }
        self.validation_pipeline = ValidationPipeline(
            [MessageValidator(), PromptValidator(config.max_messages)]
        )
        self.concurrency = ConcurrencyLimiter(
            max_per_user=config.max_concurrent_ollama,
            max_total=config.max_concurrent_openrouter,
        )
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=config.circuit_failure_threshold,
            recovery_timeout=config.circuit_recovery_timeout,
        )
        self.retry = RetryPolicy(max_retries=config.max_retries, base_delay=config.retry_base_delay)

        # Lifecycle handles
        self._health_task: asyncio.Task | None = None

        # Database
        self.db: Database | None = None
        if config.database_url:
            self.db = Database(config.database_url)

        self._setup_embeddings()
        self._setup_repositories()
        self._setup_rag()

        # Services
        self.completion_service = CompletionService(config, retry_policy=self.retry)
        self.intent_router = IntentRouter()
        self.prompt_builder = PromptBuilder()
        self.retrieval_policy = RetrievalPolicy()

        # Tools
        self.analytics_tool = AnalyticsTool(self.trade_repo) if self.trade_repo else None
        self.sql_tool = SQLTool(self.db) if self.db else None

        # AnalyticsService (capability dispatch)
        self.analytics_service = AnalyticsService(self.analytics_tool, self.sql_tool)

        # Query Planner (rule engine)
        self.query_planner = QueryPlanner()

        # Memory
        self.memory_manager = (
            MemoryManager(self.db, self.doc_repo, self.memory_repo, self.vector_repo, self.embedding_service)
            if all([self.db, self.doc_repo, self.memory_repo, self.vector_repo, self.embedding_service])
            else None
        )
        self.memory_extractor = MemoryExtractor(self.memory_manager) if self.memory_manager else None

        # Ingestion
        self.ingestion_service = (
            IngestionService(
                db=self.db,
                doc_repo=self.doc_repo,
                vector_repo=self.vector_repo,
                trade_repo=self.trade_repo,
                journal_repo=self.journal_repo,
                embedding_service=self.embedding_service,
            )
            if all([self.db, self.doc_repo, self.vector_repo, self.trade_repo, self.journal_repo, self.embedding_service])
            else None
        )

        # Execution strategies
        self.direct_strategy = DirectExecutionStrategy(
            self.retrieval_pipeline, self.retrieval_policy, self.prompt_builder, self.completion_service,
        )
        self.tool_strategy = ToolExecutionStrategy(
            self.analytics_tool, self.sql_tool, self.completion_service, self.prompt_builder,
        )

        # Agent Registry
        self.agent_registry = AgentRegistry()
        self._setup_agents()

        # Execution Planner
        self.execution_planner = ExecutionPlanner()

        # Execution Engine (parallel SQL/RAG)
        self.execution_engine = ExecutionEngine(
            analytics_service=self.analytics_service,
            retrieval_pipeline=self.retrieval_pipeline,
        )

        # ChatService — thin dispatcher
        self.chat_service = ChatService(
            intent_router=self.intent_router,
            agent_registry=self.agent_registry,
            execution_planner=self.execution_planner,
            model_router=self.model_router,
            provider_factory=self.provider_factory,
            completion_service=self.completion_service,
            config=config,
            retrieval_pipeline=self.retrieval_pipeline,
            memory_manager=self.memory_manager,
            direct_strategy=self.direct_strategy,
            tool_strategy=self.tool_strategy,
            memory_extractor=self.memory_extractor,
            feature_flags=self.feature_flags,
            query_planner=self.query_planner,
            execution_engine=self.execution_engine,
            traces_repo=self.traces_store,
        )

    def _setup_embeddings(self):
        if self.config.embedding_provider == "ollama":
            base_url = self.config.embedding_base_url or self.config.ollama_host
            provider = OllamaEmbeddingProvider(base_url=base_url, model=self.config.embedding_model)
        elif self.config.embedding_provider == "openai":
            provider = OpenAIEmbeddingProvider(
                api_key=self.config.embedding_api_key,
                base_url=self.config.openrouter_base_url,
                model=self.config.embedding_model,
            )
        else:
            provider = None
        self.embedding_service = EmbeddingService(provider) if provider else None

    def _setup_repositories(self):
        if not self.db:
            self.doc_repo = self.vector_repo = self.trade_repo = self.journal_repo = self.memory_repo = None
            return
        self.doc_repo = DocumentRepository(self.db)
        self.vector_repo = VectorRepository(self.db)
        self.trade_repo = TradeRepository(self.db)
        self.journal_repo = JournalRepository(self.db)
        self.memory_repo = MemoryRepository(self.db)

    def _setup_rag(self):
        if not self.embedding_service or not self.vector_repo:
            self.retrieval_pipeline = None
            return
        self.retrieval_pipeline = RetrievalPipeline(
            embedding_stage=QueryEmbeddingStage(self.embedding_service),
            vector_stage=VectorSearchStage(self.vector_repo),
            keyword_stage=KeywordSearchStage(self.db) if self.db else None,
            rrf_stage=RRFFusionStage(),
            filtering_stage=FilteringStage(),
            budget_stage=BudgetAllocationStage(),
        )

    def _setup_agents(self):
        strat = self.direct_strategy

        # Build CoachAgent with LangGraph if available
        coach_graph = None
        try:
            from .services.coaching_service import CoachingService
            from .agents.graphs.coach import build_coach_graph

            coaching_svc = CoachingService(
                retrieval_pipeline=self.retrieval_pipeline,
                memory_manager=self.memory_manager,
                completion_service=self.completion_service,
            )
            coach_graph = build_coach_graph(coaching_svc)
            if coach_graph:
                logger.info("Coach graph compiled successfully")
            else:
                logger.warning("Coach graph unavailable, falling back to DirectExecutionStrategy")
        except Exception as e:
            logger.warning(f"Coach graph setup failed, falling back to DirectExecutionStrategy: {e}")

        self.agent_registry.register("analytics", DirectAgent("analytics", strat, self.analytics_tool))
        self.agent_registry.register("general", DirectAgent("general", strat, None))
        self.agent_registry.register("journal", DirectAgent("journal", strat, None))
        self.agent_registry.register("coach", CoachAgent(default_strategy=strat, graph=coach_graph))
        self.agent_registry.register("research", ResearchAgent(strat))

    async def initialize(self):
        providers = self.provider_factory.all()
        await self.provider_health.check_all(providers)

        # Start background health checks (every 30s)
        self._health_task = asyncio.create_task(
            self.provider_health.start_background_checks(providers, interval=30)
        )

        if self.db:
            try:
                await self.db.connect()
                logger.info("Database connected")
            except Exception as e:
                logger.warning(f"Database connection failed: {e}")

        # Ensure default model for ollama (degraded if unavailable)
        if self.config.ai_provider == "ollama":
            ollama = self.provider_factory.get("ollama")
            model_ready = await ollama.ensure_model(self.config.default_model)
            if not model_ready:
                logger.warning(
                    f"Model {self.config.default_model} not ready — "
                    "service running in degraded mode"
                )

        logger.info("Container initialized")

    async def close(self):
        # Stop background health checks
        self.provider_health.stop()
        if self._health_task:
            self._health_task.cancel()
            try:
                await self._health_task
            except asyncio.CancelledError:
                pass

        # Cancel background tasks (memory extraction, etc.)
        if hasattr(self, "chat_service") and hasattr(self.chat_service, "background"):
            self.chat_service.background.cancel_all()

        # Close database
        if self.db:
            await self.db.close()

        # Flush telemetry
        try:
            await self.telemetry.flush()
        except Exception as e:
            logger.warning(f"Telemetry flush failed: {e}")

        logger.info("Container closed")
