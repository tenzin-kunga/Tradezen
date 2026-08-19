from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.services.research")


class ResearchService:
    """Domain logic for market research. Called by LangGraph nodes."""

    def __init__(self, retrieval_pipeline=None):
        self.retrieval = retrieval_pipeline

    async def create_plan(self, state) -> str:
        """Create research plan based on query."""
        query = getattr(state, "query", "")
        return f"Research plan for: {query}"

    async def search_web(self, state) -> list:
        """Search web for relevant information."""
        return []

    async def search_sec(self, state) -> list:
        """Search SEC filings."""
        return []

    async def search_news(self, state) -> list:
        """Search recent news."""
        return []

    async def get_financials(self, state) -> dict:
        """Get company financial data."""
        return {}

    async def merge_results(self, state) -> str:
        """Merge research results into coherent narrative."""
        return "Research results merged."

    async def critique(self, state) -> str:
        """Critique the merged research for quality."""
        return "Research critique complete."

    async def generate_report(self, state) -> str:
        """Generate final research report."""
        return "Research report generated."
