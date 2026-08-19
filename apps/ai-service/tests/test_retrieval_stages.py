import pytest
from app.retrieval.stages.rrf import RRFFusionStage, RRFConfig
from app.retrieval.stages.keyword import KeywordSearchStage
from app.retrieval.stages.vector import VectorSearchStage
from app.retrieval.pipeline import RetrievalPipeline, RetrievalOptions, RetrievalResult
from unittest.mock import AsyncMock


# ── RRF ──────────────────────────────────────────────────────
class TestRRFStage:
    def test_basic_fusion(self):
        rrf = RRFFusionStage()
        vector = [
            {"document_id": "a", "source_type": "trade", "score": 0.9},
            {"document_id": "b", "source_type": "trade", "score": 0.8},
        ]
        keyword = [
            {"document_id": "b", "source_type": "trade", "rank": 0.5},
            {"document_id": "c", "source_type": "journal", "rank": 0.3},
        ]
        result = rrf.fuse(vector, keyword)
        ids = [r["document_id"] for r in result]
        assert "a" in ids
        assert "b" in ids
        assert "c" in ids

    def test_deduplication(self):
        rrf = RRFFusionStage()
        vector = [{"document_id": "x", "source_type": "trade", "score": 0.9}]
        keyword = [{"document_id": "x", "source_type": "trade", "rank": 0.5}]
        result = rrf.fuse(vector, keyword)
        assert len(result) == 1
        assert result[0]["rrf_score"] > 0

    def test_empty_inputs(self):
        rrf = RRFFusionStage()
        assert rrf.fuse([], []) == []
        assert len(rrf.fuse([{"document_id": "a", "source_type": "t", "score": 0.5}], [])) == 1
        assert len(rrf.fuse([], [{"document_id": "b", "source_type": "t", "rank": 0.5}])) == 1

    def test_configurable_weights(self):
        rrf = RRFFusionStage(RRFConfig(k=1, vector_weight=2.0, keyword_weight=0.5))
        vector = [{"document_id": "a", "source_type": "trade", "score": 0.9}]
        keyword = [{"document_id": "a", "source_type": "trade", "rank": 0.5}]
        result = rrf.fuse(vector, keyword)
        assert result[0]["rrf_score"] > 0

    def test_rank_ordering(self):
        rrf = RRFFusionStage()
        # Doc at rank 0 should score higher than doc at rank 1
        vector = [
            {"document_id": "first", "source_type": "trade", "score": 0.9},
            {"document_id": "second", "source_type": "trade", "score": 0.8},
        ]
        result = rrf.fuse(vector, [])
        assert result[0]["document_id"] == "first"


# ── KeywordSearch ────────────────────────────────────────────
class TestKeywordSearch:
    def test_build_tsquery(self):
        assert KeywordSearchStage._build_tsquery("revenge trading") == "revenge:* & trading:*"
        assert KeywordSearchStage._build_tsquery("liquidity sweep") == "liquidity:* & sweep:*"
        assert KeywordSearchStage._build_tsquery("") == "''"

    def test_build_tsquery_special_chars(self):
        q = KeywordSearchStage._build_tsquery("what's my EUR/USD win rate")
        assert "EUR/USD" in q or "EUR" in q  # split by space


# ── VectorSearch ─────────────────────────────────────────────
class TestVectorSearch:
    @pytest.mark.asyncio
    async def test_search_delegates(self):
        mock_repo = AsyncMock()
        mock_repo.search.return_value = [{"document_id": "1", "score": 0.9}]
        stage = VectorSearchStage(mock_repo)
        result = await stage.search("user1", [0.1] * 768, top_k=5)
        mock_repo.search.assert_called_once()
        assert len(result) == 1


# ── Pipeline integration ─────────────────────────────────────
class TestPipelineIntegration:
    @pytest.mark.asyncio
    async def test_hybrid_mode(self):
        mock_embedding = AsyncMock()
        mock_embedding.embed.return_value = [0.1] * 768

        mock_vector = AsyncMock()
        mock_vector.search.return_value = [
            {"document_id": "a", "source_type": "trade", "content": "trade a", "score": 0.9, "metadata": {}},
        ]

        mock_keyword = AsyncMock()
        mock_keyword.search.return_value = [
            {"document_id": "b", "source_type": "journal", "content": "journal b", "rank": 0.5, "metadata": {}},
        ]

        pipeline = RetrievalPipeline(
            embedding_stage=mock_embedding,
            vector_stage=mock_vector,
            keyword_stage=mock_keyword,
        )
        result = await pipeline.retrieve("user1", "test query", RetrievalOptions(use_hybrid=True))
        assert isinstance(result, RetrievalResult)
        assert len(result.documents) >= 1
        assert "rrf" in result.latency_breakdown

    @pytest.mark.asyncio
    async def test_vector_only_mode(self):
        mock_embedding = AsyncMock()
        mock_embedding.embed.return_value = [0.1] * 768

        mock_vector = AsyncMock()
        mock_vector.search.return_value = [
            {"document_id": "a", "source_type": "trade", "content": "x", "score": 0.9, "metadata": {}},
        ]

        pipeline = RetrievalPipeline(
            embedding_stage=mock_embedding,
            vector_stage=mock_vector,
            keyword_stage=None,
        )
        result = await pipeline.retrieve("user1", "test", RetrievalOptions(use_hybrid=True))
        assert isinstance(result, RetrievalResult)
        assert "rrf" not in result.latency_breakdown  # no keyword = vector-only

    @pytest.mark.asyncio
    async def test_vector_only_explicit(self):
        mock_embedding = AsyncMock()
        mock_embedding.embed.return_value = [0.1] * 768

        mock_vector = AsyncMock()
        mock_vector.search.return_value = [
            {"document_id": "a", "source_type": "trade", "content": "x", "score": 0.9, "metadata": {}},
        ]

        mock_keyword = AsyncMock()
        pipeline = RetrievalPipeline(
            embedding_stage=mock_embedding,
            vector_stage=mock_vector,
            keyword_stage=mock_keyword,
        )
        result = await pipeline.retrieve("user1", "test", RetrievalOptions(use_hybrid=False))
        mock_keyword.search.assert_not_called()
