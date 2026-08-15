from __future__ import annotations

import pytest

from app.services.ingestion_service import IngestionService

pytestmark = pytest.mark.asyncio


class FakeDocRepo:
    def __init__(self):
        self.created = True
        self.docs = []

    async def create_or_find(self, **kwargs):
        doc = type("Doc", (), {"id": "doc-1"})()
        return doc, self.created

    async def list_by_source(self, user_id, source_type, source_id):
        return self.docs

    async def delete(self, document_id):
        return True


class FakeVectorRepo:
    def __init__(self):
        self.deleted = []
        self.inserted = []

    async def delete_by_document(self, document_id):
        self.deleted.append(document_id)

    async def insert(self, document_id, embedding, model):
        self.inserted.append((document_id, embedding, model))


class FakeEmbeddingService:
    def __init__(self):
        self.calls = 0

    async def generate_single(self, content):
        self.calls += 1
        return [0.1, 0.2]

    def get_model_info(self):
        return {"model": "mock-embed"}


def make_service(doc_repo=None, vector_repo=None, embedding=None):
    return IngestionService(
        db=object(),
        doc_repo=doc_repo or FakeDocRepo(),
        vector_repo=vector_repo or FakeVectorRepo(),
        trade_repo=object(),
        journal_repo=object(),
        embedding_service=embedding or FakeEmbeddingService(),
    )


async def test_upsert_unchanged_content_skips():
    doc_repo = FakeDocRepo()
    doc_repo.created = False
    vector_repo = FakeVectorRepo()
    embedding = FakeEmbeddingService()
    svc = make_service(doc_repo, vector_repo, embedding)

    result = await svc.upsert_document("u1", "trade", "t1", "same content")

    assert result["status"] == "skipped"
    assert vector_repo.inserted == []
    assert embedding.calls == 0


async def test_upsert_new_content_embeds_and_replaces_stale():
    doc_repo = FakeDocRepo()
    vector_repo = FakeVectorRepo()
    embedding = FakeEmbeddingService()
    svc = make_service(doc_repo, vector_repo, embedding)

    result = await svc.upsert_document(
        "u1", "trade", "t1", "new content", {"symbol": "AAPL"}
    )

    assert result["status"] == "upserted"
    assert vector_repo.deleted == ["doc-1"]
    assert vector_repo.inserted == [("doc-1", [0.1, 0.2], "mock-embed")]
    assert embedding.calls == 1


async def test_delete_removes_docs_and_embeddings():
    doc_repo = FakeDocRepo()
    doc_repo.docs = [type("Doc", (), {"id": "c1"})(), type("Doc", (), {"id": "c2"})()]
    vector_repo = FakeVectorRepo()
    svc = make_service(doc_repo, vector_repo)

    result = await svc.delete_document("u1", "trade", "t1")

    assert result == {"status": "deleted", "deleted": 2}
    assert vector_repo.deleted == ["c1", "c2"]


async def test_delete_not_found_is_idempotent():
    svc = make_service()

    result = await svc.delete_document("u1", "trade", "t1")

    assert result == {"status": "not_found", "deleted": 0}