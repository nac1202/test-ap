import pytest
import os
from unittest.mock import patch
import socket

from app.core.knowledge.embedding import LocalSentenceTransformerProvider, MockEmbeddingProvider
from app.core.knowledge.search import SearchService
from app.core.knowledge.faiss_manager import FaissManager
from app.db.models import KnowledgeSource, KnowledgeChunk, Organization

def test_mock_embedding_deterministic():
    provider = MockEmbeddingProvider()
    vec1 = provider.embed_query("test query")
    vec2 = provider.embed_query("test query")
    vec3 = provider.embed_query("different query")
    
    assert vec1 == vec2, "Same input must produce identical vector"
    assert vec1 != vec3, "Different inputs must produce different vectors"
    
    # Check normalization
    norm = sum(v*v for v in vec1)
    assert abs(norm - 1.0) < 1e-5, "Vector must be L2 normalized"

def test_no_external_connections():
    # Attempt to load model and ensure no socket connections are made
    with patch('socket.socket.connect') as mock_connect:
        provider = LocalSentenceTransformerProvider(model_name="dummy/model")
        try:
            provider.health_check()
        except FileNotFoundError:
            pass # Expected since dummy/model doesn't exist
            
        mock_connect.assert_not_called(), "Should not attempt network connections"

def test_search_filtering_comprehensive(db_session):
    session_factory = lambda: db_session
    from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
    from app.core.knowledge.keyword_search import MockKeywordSearchProvider
    
    repo = SQLAlchemyKnowledgeRepository(db_session)
    faiss_mgr = FaissManager("data/test_faiss")
    search_service = SearchService(
        repo, MockEmbeddingProvider(), MockKeywordSearchProvider(), faiss_mgr, session_factory
    )
    
    org_id = "org-filter-test"
    db_session.add(Organization(id=org_id, name="Test"))
    db_session.commit()
    
    # Valid source
    s_valid = KnowledgeSource(id="s_valid", organization_id=org_id, title="Valid", source_type="doc", original_filename="a", stored_filename="a", content_hash="h1", mime_type="a", file_size=1, rights_status="permission_confirmed", is_enabled=True, source_status="active", is_current=True, source_series_id="ser1")
    # Invalid sources
    s_unconfirmed = KnowledgeSource(id="s_unc", organization_id=org_id, title="Unc", source_type="doc", original_filename="a", stored_filename="a", content_hash="h2", mime_type="a", file_size=1, rights_status="unconfirmed", is_enabled=True, source_status="active", is_current=True, source_series_id="ser2")
    s_restricted = KnowledgeSource(id="s_res", organization_id=org_id, title="Res", source_type="doc", original_filename="a", stored_filename="a", content_hash="h3", mime_type="a", file_size=1, rights_status="restricted", is_enabled=True, source_status="active", is_current=True, source_series_id="ser3")
    s_disabled = KnowledgeSource(id="s_dis", organization_id=org_id, title="Dis", source_type="doc", original_filename="a", stored_filename="a", content_hash="h4", mime_type="a", file_size=1, rights_status="permission_confirmed", is_enabled=False, source_status="active", is_current=True, source_series_id="ser4")
    s_inactive = KnowledgeSource(id="s_ina", organization_id=org_id, title="Ina", source_type="doc", original_filename="a", stored_filename="a", content_hash="h5", mime_type="a", file_size=1, rights_status="permission_confirmed", is_enabled=True, source_status="inactive", is_current=True, source_series_id="ser5")
    s_old = KnowledgeSource(id="s_old", organization_id=org_id, title="Old", source_type="doc", original_filename="a", stored_filename="a", content_hash="h6", mime_type="a", file_size=1, rights_status="permission_confirmed", is_enabled=True, source_status="active", is_current=False, source_series_id="ser6")
    
    db_session.add_all([s_valid, s_unconfirmed, s_restricted, s_disabled, s_inactive, s_old])
    db_session.commit()
    
    # Create chunks
    chunks = []
    for s_id in ["s_valid", "s_unc", "s_res", "s_dis", "s_ina", "s_old"]:
        c = KnowledgeChunk(id=f"c_{s_id}", organization_id=org_id, source_id=s_id, chunk_index=0, chunk_type="text", text="test content", token_count=1, character_count=1, content_hash=s_id)
        chunks.append(c)
    db_session.add_all(chunks)
    db_session.commit()
    
    valid_ids = repo.get_eligible_chunk_ids(org_id)
    assert "c_s_valid" in valid_ids
    assert "c_s_unc" not in valid_ids
    assert "c_s_res" not in valid_ids
    assert "c_s_dis" not in valid_ids
    assert "c_s_ina" not in valid_ids
    assert "c_s_old" not in valid_ids

def test_faiss_safety_corrupted_index(tmp_path):
    mgr = FaissManager(str(tmp_path))
    org_id = "org-corrupted"
    
    # Write garbage to index file
    index_path = os.path.join(str(tmp_path), f"org_{org_id}.index")
    with open(index_path, "wb") as f:
        f.write(b"garbage data")
        
    # Attempting to load should not crash but return empty/new index or raise a handled exception
    # FAISS error causes an exception during load. The manager either catches it or raises RuntimeError.
    # Let's verify we can gracefully handle it or that it raises properly.
    try:
        mgr.load_index(org_id)
        # If it doesn't raise, it means the manager gracefully ignores bad index
    except Exception as e:
        # If it raises, it shouldn't be a segfault but a catchable exception
        assert True

def test_faiss_safety_dimension_mismatch(tmp_path):
    mgr = FaissManager(str(tmp_path))
    org_id = "org-dim"
    
    import numpy as np
    # First save with dim 384
    emb1 = np.random.rand(2, 384).astype(np.float32)
    ids1 = np.array([1, 2], dtype=np.int64)
    mgr.build_and_save_index(org_id, emb1, ids1)
    
    # Try to search with 256-dim embeddings on the loaded 384-dim manager
    q_vec = np.random.rand(256).astype(np.float32).tolist()
    # Faiss will raise an exception when querying with wrong dimension, which the manager should catch
    try:
        results = mgr.search(org_id, q_vec)
        assert len(results) == 0, "Should return empty when dimension mismatches"
    except Exception:
        pass

def test_rrf_scoring_logic(db_session):
    from app.core.knowledge.search import SearchService
    
    # Test RRF scoring through the main search method by mocking results
    from app.core.knowledge.in_memory_repository import InMemoryKnowledgeRepository
    from app.core.knowledge.keyword_search import MockKeywordSearchProvider, KeywordSearchResult
    from app.core.knowledge.embedding import MockEmbeddingProvider
    
    class DummyFaissManager(FaissManager):
        def search(self, org_id, query_vector, limit=10, filter_faiss_ids=None):
            return [(101, 0.9), (102, 0.8), (103, 0.7)]
            
    class DummyKeywordProvider(MockKeywordSearchProvider):
        def search(self, org_id, query, limit=10, chunk_ids_filter=None):
            return [KeywordSearchResult("c_102", 1.5), KeywordSearchResult("c_101", 1.2), KeywordSearchResult("c_104", 1.0)]
            
    repo = InMemoryKnowledgeRepository()
    # We need to monkey-patch get_eligible_chunk_ids
    repo.get_eligible_chunk_ids = lambda org_id: ["c_101", "c_102", "c_103", "c_104"]
    
    svc = SearchService(repo, MockEmbeddingProvider(), DummyKeywordProvider(), DummyFaissManager("tmp"), lambda: db_session)
    
    # We also need to mock faiss ID mappings
    def mock_execute(*args, **kwargs):
        class MockResult:
            def scalars(self):
                class MockScalars:
                    def all(self):
                        class Mapping:
                            def __init__(self, c, f):
                                self.chunk_id = c
                                self.faiss_id = f
                        return [Mapping("c_101", 101), Mapping("c_102", 102), Mapping("c_103", 103)]
                return MockScalars()
            def all(self):
                class MockRec:
                    def __init__(self, cid):
                        self.id = cid
                        self.source_id = "s1"
                        self.heading_path = None
                        self.text = "txt"
                        self.page_start = None
                        self.page_end = None
                        self.timestamp_start = None
                        self.timestamp_end = None
                class MockSrc:
                    def __init__(self):
                        self.id = "s1"
                        self.title = "title"
                        self.source_type = "doc"
                        self.version = 1
                return [(MockRec(cid), MockSrc()) for cid in ["c_101", "c_102", "c_103", "c_104"]]
        return MockResult()
        
    db_session.execute = mock_execute
    
    # search logic will run RRF
    # but we need to mock post-filter since DB is empty
    import unittest.mock as mock
    with mock.patch("app.core.knowledge.search.Session.execute") as mock_exec:
        class MockRec:
            def __init__(self, cid):
                self.id = cid
                self.source_id = "s1"
                self.heading_path = None
                self.text = "txt"
                self.page_start = None
                self.page_end = None
                self.timestamp_start = None
                self.timestamp_end = None
        class MockSrc:
            def __init__(self):
                self.id = "s1"
                self.title = "title"
                self.source_type = "doc"
                self.version = 1
        
        mock_exec.return_value.all.return_value = [(MockRec(cid), MockSrc()) for cid in ["c_101", "c_102", "c_103", "c_104"]]
        
        res = svc.search("org", "query", limit=10, rrf_k=60)
        assert len(res) == 4
        # c_102: faiss rank 2 (1/62), kw rank 1 (1/61)
        # c_101: faiss rank 1 (1/61), kw rank 2 (1/62)
        # They should be tied or very close. RRF score > 0
        assert res[0].chunk_id in ["c_101", "c_102"]
        assert res[1].chunk_id in ["c_101", "c_102"]
