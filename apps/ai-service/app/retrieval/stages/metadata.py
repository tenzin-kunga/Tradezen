from __future__ import annotations

import time
import logging
from dataclasses import dataclass

logger = logging.getLogger("ai_service.retrieval.metadata")


@dataclass
class MetadataFilter:
    key: str
    operator: str  # eq, neq, gt, lt, gte, lte, in, contains
    value: str | int | float | bool | list


class MetadataFilterStage:
    """Pre/post-filter by metadata fields (date range, symbol, strategy, etc.)."""

    def filter(
        self,
        documents: list[dict],
        filters: list[MetadataFilter] | None = None,
    ) -> list[dict]:
        if not filters:
            return documents

        start = time.monotonic()
        filtered = documents

        for f in filters:
            filtered = [d for d in filtered if self._matches(d, f)]

        elapsed_ms = (time.monotonic() - start) * 1000
        logger.debug(f"Metadata filter: {len(documents)} → {len(filtered)} docs ({elapsed_ms:.1f}ms)")
        return filtered

    @staticmethod
    def _matches(doc: dict, f: MetadataFilter) -> bool:
        meta = doc.get("metadata", {})
        # Also check top-level fields for common keys
        val = meta.get(f.key) or doc.get(f.key)

        if val is None:
            return False

        op = f.operator
        if op == "eq":
            return str(val) == str(f.value)
        elif op == "neq":
            return str(val) != str(f.value)
        elif op == "gt":
            return float(val) > float(f.value)
        elif op == "lt":
            return float(val) < float(f.value)
        elif op == "gte":
            return float(val) >= float(f.value)
        elif op == "lte":
            return float(val) <= float(f.value)
        elif op == "in":
            return str(val) in [str(v) for v in (f.value if isinstance(f.value, list) else [f.value])]
        elif op == "contains":
            return str(f.value).lower() in str(val).lower()
        return True
