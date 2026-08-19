from __future__ import annotations

import re
from enum import Enum


class IntentType(str, Enum):
    ANALYTICS = "analytics"
    COACH = "coach"
    RESEARCH = "research"
    JOURNAL = "journal"
    MEMORY = "memory"
    GENERAL = "general"


INTENT_PATTERNS: dict[IntentType, list[str]] = {
    IntentType.ANALYTICS: [
        r"win rate",
        r"drawdown",
        r"sharpe",
        r"expectancy",
        r"profit factor",
        r"my stats",
        r"performance",
        r"average (pnl|loss|win)",
        r"total pnl",
        r"best trade",
        r"worst trade",
    ],
    IntentType.COACH: [
        r"why do i keep",
        r"revenge",
        r"fomo",
        r"discipline",
        r"losing",
        r"emotional",
        r"coaching",
        r"improve my",
        r"stop (doing|trading)",
        r"better (trader|trading)",
    ],
    IntentType.RESEARCH: [
        r"research",
        r"analyze .{1,30} stock",
        r"earnings",
        r"sec filing",
        r"market analysis",
        r"fundamental",
        r"technical analysis (of|on)",
    ],
    IntentType.JOURNAL: [
        r"summarize.*journal",
        r"journal (analysis|entry|entries)",
        r"what did i (write|note|log)",
        r"my notes",
        r"pre.?market",
        r"post.?market",
    ],
}


def classify_intent(query: str) -> tuple[IntentType, float]:
    """Classify user intent via pattern matching. Returns (intent, confidence)."""
    query_lower = query.lower().strip()

    scores: dict[IntentType, int] = {}
    for intent, patterns in INTENT_PATTERNS.items():
        matches = sum(1 for p in patterns if re.search(p, query_lower))
        if matches > 0:
            scores[intent] = matches

    if not scores:
        return IntentType.GENERAL, 1.0

    best = max(scores, key=lambda k: scores[k])
    total_matches = sum(scores.values())
    confidence = min(scores[best] / max(total_matches, 1) + 0.3, 1.0)

    return best, round(confidence, 2)
