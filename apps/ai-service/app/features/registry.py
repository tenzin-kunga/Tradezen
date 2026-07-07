from __future__ import annotations


class FeatureRegistry:
    """Feature flags. Components check this to adapt behavior."""

    def __init__(
        self,
        rag: bool = True,
        memory: bool = True,
        tools: bool = True,
        streaming: bool = True,
        cache: bool = True,
    ):
        self._features = {
            "rag": rag,
            "memory": memory,
            "tools": tools,
            "streaming": streaming,
            "cache": cache,
        }

    def is_enabled(self, feature: str) -> bool:
        return self._features.get(feature, False)

    def set(self, feature: str, enabled: bool):
        self._features[feature] = enabled

    def all_enabled(self) -> dict[str, bool]:
        return dict(self._features)
