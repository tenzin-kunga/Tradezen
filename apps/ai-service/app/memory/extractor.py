from __future__ import annotations

import logging

from ..memory.manager import MemoryManager

logger = logging.getLogger("ai_service.memory.extractor")


class MemoryExtractor:
    """Background memory extraction from conversation responses."""

    def __init__(self, memory_manager: MemoryManager):
        self.memory_manager = memory_manager

    async def extract_and_store(
        self, user_id: str, user_message: str, assistant_response: str, wait: bool = False,
    ) -> list[str]:
        """Extract facts from a conversation turn and store as memories."""

        extracted = []

        # Simple heuristic extraction — upgrade to LLM-based extraction later
        # ponytail: regex-based extraction, upgrade to LLM summarization if quality matters
        import re

        # Extract explicit preferences
        pref_patterns = [
            (r"I (prefer|like|want|need)\s+(.{10,100}?)(?:\.|$)", "preference"),
            (r"I (trade|always|never|usually)\s+(.{10,100}?)(?:\.|$)", "fact"),
            (r"My (goal|target|aim)\s+.{0,10}(is|:)\s+(.{10,100}?)(?:\.|$)", "goal"),
            (r"I learned\s+(.{10,150}?)(?:\.|$)", "lesson"),
        ]

        messages = [user_message, assistant_response]
        for text in messages:
            for pattern, mtype in pref_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                for match in matches:
                    content = match[-1].strip()
                    if len(content) > 10:
                        try:
                            doc_id = await self.memory_manager.add_memory(
                                user_id=user_id,
                                content=content,
                                memory_type=mtype,
                                importance=6,
                            )
                            extracted.append(doc_id)
                            logger.info(f"Extracted memory [{mtype}]: {content[:80]}...")
                        except Exception as e:
                            logger.warning(f"Failed to store extracted memory: {e}")

        return extracted
