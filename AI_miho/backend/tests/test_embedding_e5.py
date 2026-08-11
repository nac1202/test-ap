import pytest
import math
from app.core.knowledge.embedding import get_embedding_provider, LocalSentenceTransformerProvider

# Use a fixture to get the provider, ensuring it's available
@pytest.fixture(scope="module")
def e5_provider():
    # Attempt to load the real model. This will fail if not downloaded,
    # which is the correct behavior for this test file.
    import os
    os.environ["ALLOW_MOCK_EMBEDDING"] = "false"
    try:
        provider = get_embedding_provider("intfloat/multilingual-e5-small")
        return provider
    except Exception as e:
        pytest.skip(f"Real E5 model not available for testing: {e}")

def test_e5_dimension(e5_provider):
    assert e5_provider.dimension() == 384, "E5-small dimension must be 384"

def test_e5_query_prefix(e5_provider):
    # The provider handles adding the prefix internally
    q_vec = e5_provider.embed_query("これはテストです")
    assert len(q_vec) == 384
    
    # Check L2 normalization
    norm = math.sqrt(sum(v*v for v in q_vec))
    assert math.isclose(norm, 1.0, rel_tol=1e-4), "Query embedding must be L2 normalized"

def test_e5_passage_prefix(e5_provider):
    p_vecs = e5_provider.embed_documents(["本文のテストです"])
    assert len(p_vecs) == 1
    assert len(p_vecs[0]) == 384
    
    # Check L2 normalization
    norm = math.sqrt(sum(v*v for v in p_vecs[0]))
    assert math.isclose(norm, 1.0, rel_tol=1e-4), "Passage embedding must be L2 normalized"

def test_e5_double_prefix_prevention(e5_provider):
    # User accidentally adds prefix
    vec1 = e5_provider.embed_query("query: テスト")
    vec2 = e5_provider.embed_query("テスト")
    
    # Since we prevent double prefix, they should be the same
    # But note: real embeddings are floats. We can check if they are identical
    for v1, v2 in zip(vec1, vec2):
        assert math.isclose(v1, v2, rel_tol=1e-5), "Double prefix prevention failed for query"
        
    p_vecs1 = e5_provider.embed_documents(["passage: テスト"])
    p_vecs2 = e5_provider.embed_documents(["テスト"])
    
    for v1, v2 in zip(p_vecs1[0], p_vecs2[0]):
        assert math.isclose(v1, v2, rel_tol=1e-5), "Double prefix prevention failed for passage"

def test_e5_empty_string_handling(e5_provider):
    # Empty string should not crash and should return a valid dimension vector
    q_vec = e5_provider.embed_query("")
    assert len(q_vec) == 384
    
    p_vecs = e5_provider.embed_documents(["", "   ", "\n"])
    assert len(p_vecs) == 3
    for v in p_vecs:
        assert len(v) == 384

def test_e5_long_text_and_newlines(e5_provider):
    long_text = "あ" * 1000 + "\n\nこれは改行を含む長文のテストです。" * 10
    # Should not crash (might truncate internally inside transformer, but should work)
    vec = e5_provider.embed_query(long_text)
    assert len(vec) == 384

def test_e5_batch_processing(e5_provider):
    passages = [f"チャンク{i}のデータです。" for i in range(10)]
    vecs = e5_provider.embed_documents(passages)
    assert len(vecs) == 10
    for v in vecs:
        assert len(v) == 384
