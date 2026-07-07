from __future__ import annotations

from ..models.provider import ModelProfile


MODEL_PROFILES: dict[str, ModelProfile] = {
    "qwen3:latest": ModelProfile(
        name="qwen3:latest",
        provider="ollama",
        context_window=40960,
        temperature=0.4,
        supports_tools=True,
        supports_vision=False,
        supports_reasoning=True,
    ),
    "qwen/qwen3-next-80b-a3b-instruct:free": ModelProfile(
        name="qwen/qwen3-next-80b-a3b-instruct:free",
        provider="openrouter",
        context_window=131072,
        temperature=0.4,
        supports_tools=True,
        supports_vision=False,
        supports_reasoning=True,
        cost_per_1k_input=0.0,
        cost_per_1k_output=0.0,
    ),
}


def get_profile(model: str) -> ModelProfile | None:
    return MODEL_PROFILES.get(model)


def register_profile(profile: ModelProfile):
    MODEL_PROFILES[profile.name] = profile
