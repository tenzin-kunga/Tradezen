from __future__ import annotations

import re
from dataclasses import dataclass, field

_PLACEHOLDER = re.compile(r"\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}")


@dataclass
class PromptTemplate:
    """A versioned prompt template with variables."""
    name: str
    content: str
    version: int = 1
    variables: list[str] = field(default_factory=list)

    def render(self, **kwargs) -> str:
        # Resolve every {{variable}} in the template. Missing variables
        # render as empty so internal placeholders can never leak to the model.
        def _replace(match):
            return str(kwargs.get(match.group(1), ""))

        return _PLACEHOLDER.sub(_replace, self.content)
