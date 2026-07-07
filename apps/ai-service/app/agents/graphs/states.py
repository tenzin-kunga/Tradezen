from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class CoachState:
    """Typed state for LangGraph coaching workflow."""
    user_id: str = ""
    request_id: str = ""
    trace_id: str = ""
    started_at: float = field(default_factory=time.monotonic)
    query: str = ""
    analytics: dict = field(default_factory=dict)
    journals: list = field(default_factory=list)
    memories: list = field(default_factory=list)
    behavior_analysis: str = ""
    coaching_output: str = ""
    validation_result: str = ""
    stored: bool = False


@dataclass
class JournalState:
    """Typed state for LangGraph journal analysis workflow."""
    user_id: str = ""
    request_id: str = ""
    trace_id: str = ""
    started_at: float = field(default_factory=time.monotonic)
    query: str = ""
    journal_entry: str = ""
    emotion_analysis: str = ""
    patterns: list = field(default_factory=list)
    memory_updates: list = field(default_factory=list)
    recommendations: list = field(default_factory=list)


@dataclass
class ResearchState:
    """Typed state for LangGraph research workflow."""
    user_id: str = ""
    request_id: str = ""
    trace_id: str = ""
    started_at: float = field(default_factory=time.monotonic)
    query: str = ""
    plan: str = ""
    search_results: list = field(default_factory=list)
    sec_findings: list = field(default_factory=list)
    news: list = field(default_factory=list)
    financials: dict = field(default_factory=dict)
    merge_result: str = ""
    critique: str = ""
    final_report: str = ""
