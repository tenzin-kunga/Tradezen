from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Request, HTTPException

from ..retrieval.pipeline import RetrievalOptions

logger = logging.getLogger("ai_service.retrieval")

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


@router.post("")
async def retrieve(request: Request):
    """Hybrid retrieval backed by the existing RetrievalPipeline.

    Contract (docs/planning/2026-08-14 §15): NestJS owns orchestration; Python
    owns retrieval. Auth is the x-internal-api-key checked by the global
    middleware; user_id comes from trusted server-side auth only. Empty results
    return documents: [] (never 404); failures degrade to whatever succeeded.
    """
    container = request.app.state.container
    if not container.retrieval_pipeline:
        raise HTTPException(status_code=503, detail="Retrieval unavailable (no database)")

    body = await request.json()
    session = getattr(request.state, "session", None)
    user_id = body.get("user_id") or (session.user_id if session else "")
    if not user_id or user_id == "unknown":
        raise HTTPException(status_code=400, detail="user_id required (trusted server-side auth)")

    query = (body.get("query") or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="query required")

    request_id = body.get("requestId") or str(uuid.uuid4())
    intent = body.get("intent", "chat")
    source_types = body.get("sourceTypes")
    budget_tokens = body.get("budgetTokens")

    # Python owns retrieval policy: intent → profile, never caller tuning.
    policy = container.retrieval_policy.get_policy(intent)
    options = RetrievalOptions(
        top_k=policy["top_k"],
        min_score=policy["min_score"],
        max_tokens=budget_tokens or policy["max_tokens"],
        source_types=source_types or None,
    )

    try:
        result = await container.retrieval_pipeline.retrieve(user_id, query, options)
    except Exception as e:
        logger.warning(f"Retrieval degraded: {e}")
        return {
            "requestId": request_id,
            "documents": [],
            "debug": {
                "candidates": 0,
                "filtered": 0,
                "latencyMs": 0,
                "method": "vector",
                "breakdown": {},
                "degraded": True,
            },
        }

    method = "hybrid" if (options.use_hybrid and container.retrieval_pipeline.keyword) else "vector"
    return {
        "requestId": request_id,
        "documents": [
            {
                "documentId": d.document_id,
                "chunkId": None,
                "sourceType": d.source_type,
                "sourceId": d.source_id,
                "content": d.content,
                "title": d.title,
                "score": d.score,
                "retrievalMethod": "rrf" if method == "hybrid" else "vector",
                "metadata": d.metadata,
            }
            for d in result.documents
        ],
        "debug": {
            "candidates": result.total_candidates,
            "filtered": result.total_filtered,
            "latencyMs": result.latency_ms,
            "method": method,
            "breakdown": result.latency_breakdown,
        },
    }
