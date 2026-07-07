from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PromptTemplate:
    """A versioned prompt template with variables."""
    name: str
    content: str
    version: int = 1
    variables: list[str] = field(default_factory=list)

    def render(self, **kwargs) -> str:
        result = self.content
        for key, value in kwargs.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result
