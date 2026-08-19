from __future__ import annotations

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    """All configuration comes from environment variables."""

    # Provider
    ai_provider: str = "ollama"
    default_model: str = "qwen3:latest"

    # Ollama
    ollama_host: str = "http://localhost:11434"

    # Cloud (generic OpenAI-compatible provider: OpenRouter, NVIDIA, Groq, …)
    cloud_provider_name: str = "cloud"
    cloud_api_key: str = ""
    cloud_base_url: str = ""
    cloud_timeout: int = 30

    # Per-provider base URL map (resolved from X-AI-Provider header)
    provider_base_urls: dict[str, str] = {
        "openai": "https://api.openai.com/v1",
        "anthropic": "https://api.anthropic.com/v1",
        "google": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "openrouter": "https://openrouter.ai/api/v1",
        "mistral": "https://api.mistral.ai/v1",
        "groq": "https://api.groq.com/openai/v1",
        "together": "https://api.together.xyz/v1",
        "perplexity": "https://api.perplexity.ai",
        "fireworks": "https://api.fireworks.ai/inference/v1",
        "deepseek": "https://api.deepseek.com/v1",
        "xai": "https://api.x.ai/v1",
        "ollama": "http://localhost:11434/v1",
        "lmstudio": "http://localhost:1234/v1",
        "vllm": "http://localhost:8000/v1",
        "localai": "http://localhost:8080/v1",
        "litellm": "http://localhost:4000/v1",
    }

    # Rate limits
    chat_rate_limit: str = "60/min"
    research_rate_limit: str = "5/min"
    coaching_rate_limit: str = "20/hour"
    embedding_rate_limit: str = "100/min"

    # Model discovery
    model_discovery_ttl: int = 600

    # Concurrency
    max_concurrent_ollama: int = 4
    max_concurrent_cloud: int = 20

    # Validation
    max_prompt_size: int = 20000
    max_messages: int = 50
    max_retrieval_top_k: int = 10
    max_tool_calls: int = 5
    max_langgraph_steps: int = 20

    # Timeouts (seconds)
    ollama_timeout: int = 120

    sql_timeout: int = 5
    retrieval_timeout: int = 3

    # Circuit breaker
    circuit_failure_threshold: int = 5
    circuit_recovery_timeout: int = 30

    # Retry
    max_retries: int = 2
    retry_base_delay: float = 0.5

    # Budget
    daily_cost_budget: float = 20.0

    # Auth
    auth_secret: str = ""

    # Database
    database_url: str = ""

    # Embedding
    embedding_provider: str = "ollama"  # ollama or openai
    embedding_model: str = "nomic-embed-text"
    embedding_base_url: str = ""
    embedding_api_key: str = ""

    # Feature flags
    enable_rag: bool = True
    enable_memory: bool = True
    enable_tools: bool = True
    enable_streaming: bool = True
    enable_cache: bool = True

    # NestJS integration
    nestjs_internal_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @classmethod
    def from_env(cls) -> Config:
        return cls()
