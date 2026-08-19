from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.services.journal")


class JournalAnalysisService:
    """Domain logic for journal analysis. Called by LangGraph nodes."""

    def __init__(self, retrieval_pipeline=None, memory_manager=None):
        self.retrieval = retrieval_pipeline
        self.memory = memory_manager

    async def analyze_emotion(self, state) -> str:
        """Detect emotions from journal entry text."""
        entry = getattr(state, "journal_entry", "") or getattr(state, "query", "")
        return f"Emotion analysis of journal entry."

    async def detect_patterns(self, state) -> list:
        """Detect recurring patterns in journal entries."""
        return []

    async def update_memories(self, state) -> list:
        """Update user memories based on journal insights."""
        if not self.memory:
            return []
        try:
            return await self.memory.get_user_memories(state.user_id)
        except Exception as e:
            logger.warning(f"Memory update failed: {e}")
            return []

    async def generate_recommendations(self, state) -> list:
        """Generate actionable recommendations from journal analysis."""
        return ["Keep a consistent journal practice."]
