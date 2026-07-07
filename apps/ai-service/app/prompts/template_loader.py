from __future__ import annotations

import os
from pathlib import Path

from .template import PromptTemplate


class TemplateLoader:
    """Loads .md files into PromptTemplate objects."""

    def __init__(self, base_dir: str | Path | None = None):
        if base_dir is None:
            base_dir = Path(__file__).parent.parent.parent / "prompts"
        self.base_dir = Path(base_dir)

    def load(self, name: str) -> PromptTemplate:
        file_path = self.base_dir / f"{name}.md"
        if not file_path.exists():
            raise FileNotFoundError(f"Template not found: {file_path}")
        content = file_path.read_text(encoding="utf-8")
        version = 1
        if content.startswith("---"):
            end = content.find("---", 3)
            if end != -1:
                header = content[3:end].strip()
                for line in header.split("\n"):
                    if line.startswith("version:"):
                        version = int(line.split(":")[1].strip())
                content = content[end + 3:].strip()
        return PromptTemplate(name=name, content=content, version=version)
