"""
JournalGraph — LangGraph workflow for journal analysis.

Flow:
  JournalEntry → EmotionAnalysis → PatternDetection → MemoryUpdate → Recommendations

All nodes delegate to JournalAnalysisService.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("ai_service.graphs.journal")


def build_journal_graph(journal_service):
    try:
        from langgraph.graph import StateGraph
        from .states import JournalState
    except ImportError:
        logger.warning("LangGraph not installed. JournalGraph unavailable.")
        return None

    graph = StateGraph(JournalState)

    async def analyze_emotion(state: JournalState):
        state.emotion_analysis = await journal_service.analyze_emotion(state)
        return state

    async def detect_patterns(state: JournalState):
        state.patterns = await journal_service.detect_patterns(state)
        return state

    async def update_memories(state: JournalState):
        state.memory_updates = await journal_service.update_memories(state)
        return state

    async def generate_recommendations(state: JournalState):
        state.recommendations = await journal_service.generate_recommendations(state)
        return state

    graph.add_node("analyze_emotion", analyze_emotion)
    graph.add_node("detect_patterns", detect_patterns)
    graph.add_node("update_memories", update_memories)
    graph.add_node("generate_recommendations", generate_recommendations)

    graph.set_entry_point("analyze_emotion")
    graph.add_edge("analyze_emotion", "detect_patterns")
    graph.add_edge("detect_patterns", "update_memories")
    graph.add_edge("update_memories", "generate_recommendations")

    return graph.compile()
