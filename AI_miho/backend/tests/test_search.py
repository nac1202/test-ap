import pytest
import os
import numpy as np
from unittest.mock import patch, MagicMock

from app.core.knowledge.embedding import get_embedding_provider, MockEmbeddingProvider, LocalSentenceTransformerProvider
from app.core.knowledge.keyword_search import check_fts5_trigram_support, get_keyword_search_provider, KeywordSearchResult
from app.core.knowledge.faiss_manager import FaissManager
from app.core.knowledge.search import SearchService
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.db.models import KnowledgeSource, KnowledgeChunk, ChunkFaissMapping

def test_mock_embedding_provider_fallback(monkeypatch):
    # If ALLOW_MOCK_EMBEDDING is not true and model doesn't exist, it should raise RuntimeError
    monkeypatch.setenv("EMBEDDING_MODEL_ROOT", "/invalid/path/that/doesnt/exist")
    monkeypatch.setenv("ALLOW_MOCK_EMBEDDING", "false")
    
    with pytest.raises(RuntimeError, match="ローカル埋め込みモデルが配置されていないため、検索を実行できません"):
        get_embedding_provider("nonexistent-model")
        
    # If ALLOW_MOCK_EMBEDDING is true, it should return MockEmbeddingProvider
    monkeypatch.setenv("ALLOW_MOCK_EMBEDDING", "true")
    provider = get_embedding_provider("nonexistent-model")
    assert isinstance(provider, MockEmbeddingProvider)

def test_embedding_directory_traversal():
    # Test directory traversal prevention (using Windows backslash for testing)
    with pytest.raises(PermissionError, match="outside of the permitted root directory"):
        LocalSentenceTransformerProvider(model_name="..\\..\\Windows\\System32")

def test_keyword_search_provider_hybrid(db_session):
    session_factory = lambda: db_session
    provider = get_keyword_search_provider(session_factory)
    
    # Check what method is used
    if provider.is_fts5_available:
        provider.search("org", "テスト") # >= 3 chars
        assert provider.get_method_name() == "FTS5 trigram"
        
        provider.search("org", "テス") # < 3 chars
        assert provider.get_method_name() == "LIKE"
    else:
        provider.search("org", "テスト")
        assert provider.get_method_name() == "LIKE"

def test_faiss_manager_atomic_save_and_checksum(tmp_path):
    manager = FaissManager(data_dir=str(tmp_path))
    
    emb = np.array([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]], dtype=np.float32)
    ids = np.array([101, 102], dtype=np.int64)
    
    success, checksum, count = manager.build_and_save_index("org-test", emb, ids)
    assert success is True
    assert count == 2
    assert checksum is not None
    
    index_path = os.path.join(str(tmp_path), "org_org-test.index")
    assert os.path.exists(index_path)
    assert not os.path.exists(index_path + ".tmp")
    
    loaded = manager.load_index("org-test")
    assert loaded.ntotal == 2

def test_search_service_filtering_and_rrf(db_session):
    session_factory = lambda: db_session
    repo = SQLAlchemyKnowledgeRepository(db_session)
    org_id = "org-test"
    
    from app.db.models import Organization
    db_session.add(Organization(id=org_id, name="Test Org"))
    db_session.commit()

    
    s1 = KnowledgeSource(
        id="s1", organization_id=org_id, title="Title 1", source_type="doc", original_filename="a", stored_filename="a",
        content_hash="h1", mime_type="a", file_size=1, rights_status="permission_confirmed", source_status="active",
        source_series_id="ser1", is_enabled=True, is_current=True
    )
    s2 = KnowledgeSource(
        id="s2", organization_id=org_id, title="Disabled", source_type="doc", original_filename="b", stored_filename="b",
        content_hash="h2", mime_type="a", file_size=1, rights_status="unconfirmed", source_status="active", # Unconfirmed!
        source_series_id="ser2", is_enabled=True, is_current=True
    )
    db_session.add_all([s1, s2])
    db_session.commit()
    
    c1 = KnowledgeChunk(id="c1", organization_id=org_id, source_id="s1", chunk_index=0, chunk_type="t", text="test 1", token_count=1, character_count=1, content_hash="hc1")
    c2 = KnowledgeChunk(id="c2", organization_id=org_id, source_id="s2", chunk_index=0, chunk_type="t", text="test 2", token_count=1, character_count=1, content_hash="hc2")
    db_session.add_all([c1, c2])
    db_session.commit()
    
    db_session.add_all([ChunkFaissMapping(chunk_id="c1", faiss_id=1), ChunkFaissMapping(chunk_id="c2", faiss_id=2)])
    db_session.commit()

    # Mock providers
    emb_provider = MockEmbeddingProvider(dimension=3)
    
    kw_provider = MagicMock()
    kw_provider.get_method_name.return_value = "MockKW"
    # Return both as matches, but search service should filter c2 out BEFORE passing to kw_provider
    kw_provider.search.side_effect = lambda org, q, limit, chunk_ids_filter: [
        KeywordSearchResult(chunk_id=cid, score=1.0) for cid in chunk_ids_filter
    ]
    
    faiss_mgr = MagicMock()
    # Return both, but filter should apply
    faiss_mgr.search.side_effect = lambda org, q, limit, filter_faiss_ids: [
        (fid, 0.9) for fid in filter_faiss_ids
    ]
    
    service = SearchService(repo, emb_provider, kw_provider, faiss_mgr, session_factory)
    
    results = service.search(org_id, "test")
    
    assert len(results) == 1
    assert results[0].chunk_id == "c1"
    assert results[0].source_id == "s1"
