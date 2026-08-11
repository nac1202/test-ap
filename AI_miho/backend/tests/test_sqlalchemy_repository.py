import pytest
from datetime import datetime, timezone, timedelta
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.models.knowledge import (
    KnowledgeSource, KnowledgeDocument, KnowledgeChunk, TranscriptCue
)
from sqlalchemy.exc import IntegrityError

@pytest.fixture
def repo(db_session):
    return SQLAlchemyKnowledgeRepository(db_session)

def test_create_and_get_source(repo, db_session):
    org_id = "org-1"
    
    source = KnowledgeSource(
        id="src-1",
        organization_id=org_id,
        title="Test Title",
        source_type="document",
        original_filename="test.pdf",
        stored_filename="stored.pdf",
        content_hash="hash1",
        mime_type="application/pdf",
        file_size=1024,
        rights_status="permission_confirmed",
        source_status="active",
        source_series_id="series-1"
    )
    
    created = repo.create_source(source)
    assert created.id == "src-1"
    
    # Commit the transaction so it's readable in new queries
    db_session.commit()
    
    fetched = repo.get_source(org_id, "src-1")
    assert fetched is not None
    assert fetched.title == "Test Title"

def test_organization_isolation(repo, db_session):
    org_id_1 = "org-1"
    org_id_2 = "org-2"
    
    source1 = KnowledgeSource(
        id="src-1", organization_id=org_id_1, title="Test 1", source_type="document",
        original_filename="a", stored_filename="b", content_hash="h1", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="series-1"
    )
    
    source2 = KnowledgeSource(
        id="src-2", organization_id=org_id_2, title="Test 2", source_type="document",
        original_filename="a", stored_filename="b", content_hash="h2", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="series-2"
    )
    
    repo.create_source(source1)
    repo.create_source(source2)
    db_session.commit()
    
    # Try to access src-2 using org-1 (should return None)
    assert repo.get_source(org_id_1, "src-2") is None
    
    # Cross-org binary hash lookup
    assert len(repo.find_by_binary_hash(org_id_1, "h2")) == 0
    assert len(repo.find_by_binary_hash(org_id_2, "h2")) == 1

def test_atomic_version_replacement(repo, db_session):
    org_id = "org-1"
    
    source_v1 = KnowledgeSource(
        id="src-v1", organization_id=org_id, title="Test", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h1", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="series-v", version=1
    )
    
    repo.create_source(source_v1)
    db_session.commit()
    
    source_v2 = KnowledgeSource(
        id="src-v2", organization_id=org_id, title="Test V2", source_type="doc",
        original_filename="a", stored_filename="b", content_hash="h2", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="series-v", version=2,
        previous_version_id="src-v1"
    )
    
    # Replace version
    new_src = repo.replace_current_version(org_id, "src-v1", source_v2)
    db_session.commit()
    
    assert new_src.id == "src-v2"
    assert new_src.previous_version_id == "src-v1"
    
    old_fetched = repo.get_source(org_id, "src-v1")
    assert old_fetched.is_current is False
    
    new_fetched = repo.get_source(org_id, "src-v2")
    assert new_fetched.is_current is True

def test_eligible_sources(repo, db_session):
    org_id = "org-1"
    now = datetime.now(timezone.utc)
    
    # 1. Valid source
    src_valid = KnowledgeSource(
        id="src-valid", organization_id=org_id, title="Valid", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h_valid", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="s1",
        is_enabled=True
    )
    
    # 2. Expired source
    src_expired = KnowledgeSource(
        id="src-expired", organization_id=org_id, title="Expired", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h_exp", mime_type="a", file_size=1,
        rights_status="permission_confirmed", permission_valid_until=now - timedelta(days=1), source_status="active", source_series_id="s2"
    )
    
    repo.create_source(src_valid)
    repo.create_source(src_expired)
    db_session.commit()
    
    eligible = repo.list_eligible_sources(org_id)
    assert len(eligible) == 1
    assert eligible[0].id == "src-valid"

def test_chunk_creation_and_links(repo, db_session):
    org_id = "org-1"
    src = KnowledgeSource(
        id="src-1", organization_id=org_id, title="T", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h1", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="s1"
    )
    repo.create_source(src)
    
    chunk1 = KnowledgeChunk(
        id="chunk-1", organization_id=org_id, source_id="src-1", chunk_index=0,
        chunk_type="text", text="A", token_count=1, character_count=1, content_hash="c1"
    )
    chunk2 = KnowledgeChunk(
        id="chunk-2", organization_id=org_id, source_id="src-1", chunk_index=1,
        chunk_type="text", text="B", token_count=1, character_count=1, content_hash="c2"
    )
    
    repo.create_chunks([chunk1, chunk2])
    db_session.commit()
    
    # Need to check links using raw query or testing adjacency
    adj = repo.get_adjacent_chunks(org_id, "chunk-1", forward=1, backward=0)
    assert len(adj) == 2
    
    # Let's verify DB links directly
    from app.db.models import KnowledgeChunk as DBChunk
    from sqlalchemy import select
    c1 = db_session.execute(select(DBChunk).where(DBChunk.id == "chunk-1")).scalar_one()
    assert c1.next_chunk_id == "chunk-2"
    
    c2 = db_session.execute(select(DBChunk).where(DBChunk.id == "chunk-2")).scalar_one()
    assert c2.previous_chunk_id == "chunk-1"
