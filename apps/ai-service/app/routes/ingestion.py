from __future__ import annotations

from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/trades")
async def ingest_trades(request: Request):
    container = request.app.state.container
    if not container.ingestion_service:
        raise HTTPException(status_code=503, detail="Ingestion service unavailable (no database)")

    user_id = _get_user_id(request)
    result = await container.ingestion_service.ingest_trades(user_id)
    return {
        "scanned": result.scanned,
        "created": result.created,
        "skipped": result.skipped,
        "failed": result.failed,
        "errors": result.errors,
    }


@router.post("/journals")
async def ingest_journals(request: Request):
    container = request.app.state.container
    if not container.ingestion_service:
        raise HTTPException(status_code=503, detail="Ingestion service unavailable (no database)")

    user_id = _get_user_id(request)
    result = await container.ingestion_service.ingest_journals(user_id)
    return {
        "scanned": result.scanned,
        "created": result.created,
        "skipped": result.skipped,
        "failed": result.failed,
        "errors": result.errors,
    }


@router.post("/all")
async def ingest_all(request: Request):
    container = request.app.state.container
    if not container.ingestion_service:
        raise HTTPException(status_code=503, detail="Ingestion service unavailable (no database)")

    user_id = _get_user_id(request)
    results = await container.ingestion_service.ingest_all(user_id)
    return {
        name: {
            "scanned": r.scanned,
            "created": r.created,
            "skipped": r.skipped,
            "failed": r.failed,
            "errors": r.errors,
        }
        for name, r in results.items()
    }


@router.get("/status")
async def ingest_status(request: Request):
    container = request.app.state.container
    if not container.ingestion_service:
        raise HTTPException(status_code=503, detail="Ingestion service unavailable (no database)")

    user_id = _get_user_id(request)
    return await container.ingestion_service.get_status(user_id)


def _get_user_id(request: Request) -> str:
    body = getattr(request, "_body", None)
    if body:
        uid = body.get("user_id")
        if uid:
            return uid
    # Fallback: query param
    uid = request.query_params.get("user_id")
    if uid:
        return uid
    raise HTTPException(status_code=400, detail="user_id required (body or query param)")
