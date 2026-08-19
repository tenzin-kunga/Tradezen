from __future__ import annotations

import re

from app.prompts.builder import PromptBuilder
from app.prompts.template import PromptTemplate

PLACEHOLDER = re.compile(r"\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}")


def test_render_substitutes_provided_variables():
    template = PromptTemplate(name="t", content="A {{x}} B")
    assert template.render(x="value") == "A value B"


def test_render_resolves_missing_variables_to_empty():
    template = PromptTemplate(name="t", content="A {{x}} B")
    assert template.render() == "A  B"


def test_render_no_placeholder_survives():
    template = PromptTemplate(name="t", content="{{a}} {{b}} {{c}}")
    assert not PLACEHOLDER.search(template.render(a="1", c="3"))


class TestNoPlaceholderLeak:
    def setup_method(self):
        self.builder = PromptBuilder()

    def _system_prompt(self, template_name: str, **kwargs) -> str:
        messages = [{"role": "user", "content": "help"}]
        return self.builder.build(template_name, messages, **kwargs)[0]["content"]

    def test_chat_empty_sections(self):
        prompt = self._system_prompt("chat")
        assert not PLACEHOLDER.search(prompt)
        assert "{{documents}}" not in prompt
        assert "{{memories}}" not in prompt
        assert "{{tool_results}}" not in prompt

    def test_analytics_empty_sections(self):
        prompt = self._system_prompt("analytics")
        assert not PLACEHOLDER.search(prompt)
        assert "{{documents}}" not in prompt
        assert "{{tool_results}}" not in prompt

    def test_research_empty_sections(self):
        prompt = self._system_prompt("research")
        assert not PLACEHOLDER.search(prompt)
        assert "{{documents}}" not in prompt

    def test_journal_empty_sections(self):
        prompt = self._system_prompt("journal")
        assert not PLACEHOLDER.search(prompt)
        assert "{{documents}}" not in prompt
        assert "{{memories}}" not in prompt

    def test_coaching_empty_sections(self):
        prompt = self._system_prompt("coaching")
        assert not PLACEHOLDER.search(prompt)
        assert "{{documents}}" not in prompt
        assert "{{memories}}" not in prompt
        assert "{{analytics}}" not in prompt

    def test_documents_rendered_when_present(self):
        prompt = self._system_prompt(
            "chat", retrieved_docs=[_Doc("sold EURUSD at market open for +120 pips")]
        )
        assert "sold EURUSD" in prompt
        assert "{{documents}}" not in prompt

    def test_memories_rendered_when_present(self):
        prompt = self._system_prompt(
            "chat", memories=[_Doc("prefers risk-averse setups above all")]
        )
        assert "risk-averse" in prompt
        assert "{{memories}}" not in prompt

    def test_tool_results_rendered_when_present(self):
        prompt = self._system_prompt(
            "chat", tool_results=[_Doc("win rate 62% across the full sample")]
        )
        assert "62%" in prompt
        assert "{{tool_results}}" not in prompt


class _Doc:
    def __init__(self, content: str):
        self.content = content
