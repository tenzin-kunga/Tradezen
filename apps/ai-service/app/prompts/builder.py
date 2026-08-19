from __future__ import annotations

import logging

from .template import PromptTemplate
from .template_loader import TemplateLoader
from .budget import ContextBudgetManager
from .formatters.document import DocumentFormatter
from .formatters.memory import MemoryFormatter
from .formatters.tool import ToolFormatter

logger = logging.getLogger("ai_service.prompts")


class PromptBuilder:
    """Builds prompts from templates with formatted context."""

    def __init__(self, loader: TemplateLoader | None = None, budget: ContextBudgetManager | None = None):
        self.loader = loader or TemplateLoader()
        self.budget = budget or ContextBudgetManager()
        self.doc_formatter = DocumentFormatter()
        self.mem_formatter = MemoryFormatter()
        self.tool_formatter = ToolFormatter()

    def build(
        self,
        template_name: str,
        messages: list[dict],
        retrieved_docs: list | None = None,
        memories: list | None = None,
        tool_results: list | None = None,
        extra_vars: dict | None = None,
    ) -> list[dict]:
        template = self.loader.load(template_name)

        sections = {}
        if retrieved_docs:
            sections["documents"] = self.doc_formatter.format(retrieved_docs)
        if memories:
            sections["memories"] = self.mem_formatter.format(memories)
        if tool_results:
            sections["tool_results"] = self.tool_formatter.format(tool_results)

        # Budget: truncate sections that exceed token limits
        sections = self._apply_budget(sections)

        vars_dict = {
            "conversation_history": self._format_messages(messages),
            **(sections or {}),
            **(extra_vars or {}),
        }
        rendered = template.render(**vars_dict)
        return [{"role": "system", "content": rendered}] + messages

    def _apply_budget(self, sections: dict[str, str]) -> dict[str, str]:
        """Truncate sections to fit within token budget."""
        if not sections:
            return sections

        token_counts = {k: self.budget.estimate_tokens(v) for k, v in sections.items()}
        allocated = self.budget.allocate(token_counts)

        result = {}
        for k, v in sections.items():
            max_tokens = allocated.get(k, token_counts.get(k, 0))
            max_chars = max_tokens * 4  # rough estimate: 4 chars per token
            if len(v) > max_chars:
                result[k] = v[:max_chars] + "\n[truncated]"
                logger.debug(f"Truncated {k}: {token_counts[k]} → {max_tokens} tokens")
            else:
                result[k] = v
        return result

    def _format_messages(self, messages: list[dict]) -> str:
        lines = []
        for msg in messages:
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
            lines.append(f"{role}: {content}")
        return "\n".join(lines)
