from __future__ import annotations

import re
from dataclasses import dataclass

from ..models.common import Complexity, ExecutionMode


@dataclass
class IntentResult:
    intent: str
    complexity: Complexity = Complexity.SIMPLE
    execution: ExecutionMode = ExecutionMode.DIRECT
    confidence: float = 0.5
    signals: list[str] | None = None


class IntentRouter:
    """Regex + rules intent classification. Returns intent + complexity + execution mode."""

    PATTERNS = {
        "analytics": [
            r"\b(win\s*rate|profit\s*factor|sharpe|drawdown|expectancy)\b",
            r"\b(how\s+(much|many)\s+(did\s+i|was|i)\s+(make|lose|profit|loss))\b",
            r"\b(average|avg)\s+(p[&l]*l|win|loss|trade)\b",
            r"\b(pnl|p&l|profit|loss)\s*(for|this|last|total)\b",
            r"\b(my\s+(trades?|performance|stats|statistics|numbers))\b",
            r"\b(what\s+is\s+my)\b.*\b(rate|ratio|factor|drawdown|expectancy)\b",
        ],
        "coach": [
            r"\b(coach|coaching|help\s+me|improve|better|fix|avoid)\b",
            r"\b(why\s+do\s+i|how\s+do\s+i|what\s+should\s+i)\b",
            r"\b(revenge|emotion|fomo|fear|greed|overtrading|patience|discipline)\b",
            r"\b(tip|advice|suggestion|recommendation|strategy\s+tip)\b",
            r"\b(habits?|patterns?\s+in\s+my|behavior|psychology)\b",
            r"\b(risk\s*reward|risk\s*management|position\s*sizing)\b",
            r"\bstop\s+(doing|trading)\b",
        ],
        "journal": [
            r"\b(journal|log|entry|entries|diary|reflect|reflection)\b",
            r"\b(what\s+did\s+i\s+trade|today|yesterday|last\s+week)\b",
            r"\b(mood|feeling|how\s+did\s+i\s+feel)\b",
            r"\b(lesson|learned|takeaway|note|notes)\b",
            r"\b(pre[- ]?market|post[- ]?market|market\s+notes)\b",
        ],
        "research": [
            r"\b(research|analyze|analysis|lookup|look\s+up|find)\b",
            r"\b(what\s+is|tell\s+me\s+about|explain)\b.*\b(stock|ticker|company|sector)\b",
            r"\b(aapl|googl|msft|amzn|tsla|nvda|meta|nflx|spy|qqq|dia|iwm)\b",
            r"\b(earnings|revenue|pe\s+ratio|market\s+cap|dividend)\b",
            r"\b(news|catalyst|upcoming|report|announcement)\b",
        ],
    }

    # Complexity signals: multi-step, comparison, deep analysis
    COMPLEX_SIGNALS = [
        r"\b(compare|versus|vs\.?|against|across|over\s+(time|this|last|the))\b",
        r"\b(analyze|analysis|detailed|comprehensive|deep|full|report)\b",
        r"\b(why|explain|reason|cause|because|behind)\b",
        r"\b(and).{1,50}\b(and).{1,50}\b",
        r"\b(pattern|correlat|impact|effect|predict|forecast)\b",
    ]

    def classify(self, message: str) -> IntentResult:
        lower = message.lower()
        scores: dict[str, list[str]] = {}

        for intent, patterns in self.PATTERNS.items():
            matches = [p for p in patterns if re.search(p, lower, re.IGNORECASE)]
            if matches:
                scores[intent] = matches

        if not scores:
            return IntentResult(
                intent="general",
                complexity=Complexity.SIMPLE,
                execution=ExecutionMode.DIRECT,
                confidence=0.5,
                signals=["default"],
            )

        best = max(scores.items(), key=lambda x: len(x[1]))
        intent, signals = best

        # Tie-breaking priority: journal > coach > analytics > research > general
        tied_intents = [i for i, s in scores.items() if len(s) == len(signals)]
        priority = ["journal", "coach", "analytics", "research", "general"]
        for p in priority:
            if p in tied_intents:
                intent = p
                signals = scores[p]
                break

        confidence = min(0.5 + len(signals) * 0.15, 0.95)

        # Determine complexity
        complexity = Complexity.SIMPLE
        complex_matches = sum(1 for p in self.COMPLEX_SIGNALS if re.search(p, lower, re.IGNORECASE))
        if complex_matches >= 3:
            complexity = Complexity.COMPLEX
        elif complex_matches >= 1:
            complexity = Complexity.MODERATE

        # Determine execution mode
        execution = self._get_execution_mode(intent, complexity, len(signals))

        return IntentResult(
            intent=intent,
            complexity=complexity,
            execution=execution,
            confidence=confidence,
            signals=signals,
        )

    def _get_execution_mode(self, intent: str, complexity: Complexity, signal_count: int) -> ExecutionMode:
        # Coaching, journal, research → always use workflow (LangGraph)
        if intent in ("coach", "journal", "research"):
            return ExecutionMode.WORKFLOW

        # Analytics: simple → direct, moderate/complex → tool loop
        if intent == "analytics":
            if complexity == Complexity.SIMPLE:
                return ExecutionMode.DIRECT
            return ExecutionMode.TOOL

        # General: always direct
        return ExecutionMode.DIRECT
