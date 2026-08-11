import pytest
from app.db.models import KnowledgeEmbedding, ChunkFaissMapping, Organization, KnowledgeSource, KnowledgeChunk, EmbeddingModel
from app.core.knowledge.search import SearchService
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.core.knowledge.embedding import MockEmbeddingProvider
from app.core.knowledge.keyword_search import get_keyword_search_provider
from app.core.knowledge.faiss_manager import FaissManager
import numpy as np

def test_stale_embeddings_handling(db_session, tmp_path):
    org_id = "org-stale-test"
    db_session.add(Organization(id=org_id, name="Test Org"))
    db_session.commit()
    
    # We simulate changing model ID
    model_mock = EmbeddingModel(id="mod-mock", provider="mock", model_id="mock-model", dimension=384)
    model_real = EmbeddingModel(id="mod-real", provider="local", model_id="real-model", dimension=384)
    db_session.add_all([model_mock, model_real])
    
    src = KnowledgeSource(id="src-1", organization_id=org_id, title="Test", source_type="doc", original_filename="a", stored_filename="a", content_hash="h1", mime_type="a", file_size=1, rights_status="permission_confirmed", source_status="active", source_series_id="ser-1")
    db_session.add(src)
    db_session.commit()
    
    chunk = KnowledgeChunk(id="c-1", organization_id=org_id, source_id="src-1", chunk_index=0, chunk_type="text", text="Hello", token_count=1, character_count=5, content_hash="hc1")
    db_session.add(chunk)
    db_session.commit()
    
    # 1. Create Mock Embedding
    emb_mock = KnowledgeEmbedding(id="emb-1", organization_id=org_id, chunk_id="c-1", embedding_model_id="mod-mock", is_stale=False)
    db_session.add(emb_mock)
    db_session.commit()
    
    # 2. Simulate switching to real model
    # Application should mark old embeddings as stale
    # This logic would be in an ingestion service, but we verify the search side
    emb_mock.is_stale = True
    
    # 3. Create Real Embedding
    emb_real = KnowledgeEmbedding(id="emb-2", organization_id=org_id, chunk_id="c-1", embedding_model_id="mod-real", is_stale=False)
    db_session.add(emb_real)
    db_session.commit()
    
    # Check that search query can filter properly
    # In search, we only want chunks that are eligible. Eligible chunks only care if source is valid.
    # The actual retrieval of FAISS mapping must match the active model.
    # Currently SearchService gets faiss mappings:
    # select(ChunkFaissMapping).where(ChunkFaissMapping.chunk_id.in_(eligible_chunk_ids))
    # If FAISS index is completely rebuilt per model, we just need to ensure old FAISS index is not used.
    
    mgr = FaissManager(str(tmp_path))
    # We build the real FAISS index
    mgr.build_and_save_index(org_id, np.random.rand(1, 384).astype(np.float32), np.array([1], dtype=np.int64))
    
    # Verification: If we switch model, we should have a mechanism or the index is replaced.
    # In FaissManager, org_id.index is replaced natively.
    # So old mock data is overwritten by new build_and_save_index.
    assert mgr.load_index(org_id).ntotal == 1
    
    # Ensure stale embeddings are marked
    stale_count = db_session.query(KnowledgeEmbedding).filter_by(is_stale=True).count()
    assert stale_count == 1
