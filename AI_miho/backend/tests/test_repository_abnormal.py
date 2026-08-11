import pytest
from sqlalchemy.exc import IntegrityError
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, KnowledgeChunk
from app.db.models import KnowledgeSource as DBSource, KnowledgeDocument as DBDocument

@pytest.fixture
def repo(db_session):
    return SQLAlchemyKnowledgeRepository(db_session)

def test_parent_child_org_mismatch(repo, db_session):
    # Setup source in org-1
    source = KnowledgeSource(
        id="src-org1", organization_id="org-1", title="T", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h1", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="s1"
    )
    repo.create_source(source)
    db_session.commit()
    
    # Try to add document with org-2 but source_id="src-org1"
    doc = KnowledgeDocument(
        id="doc-1", organization_id="org-2", source_id="src-org1",
        normalized_text="text", character_count=10
    )
    
    with pytest.raises(ValueError, match="does not belong to organization"):
        repo.create_document(doc)

def test_transaction_rollback_on_error(repo, db_session):
    source = KnowledgeSource(
        id="src-rollback", organization_id="org-1", title="T", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h-roll", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="s-roll"
    )
    repo.create_source(source)
    db_session.commit()
    
    # Try to create chunks, one is valid, second violates unique constraint (same chunk_index)
    c1 = KnowledgeChunk(
        id="c1", organization_id="org-1", source_id="src-rollback", chunk_index=0,
        chunk_type="text", text="A", token_count=1, character_count=1, content_hash="hc1"
    )
    c2 = KnowledgeChunk(
        id="c2", organization_id="org-1", source_id="src-rollback", chunk_index=0, # duplicate index
        chunk_type="text", text="B", token_count=1, character_count=1, content_hash="hc2"
    )
    
    with pytest.raises(IntegrityError):
        repo.create_chunks([c1, c2])
        db_session.commit()
        
    db_session.rollback()
    
    # Verify c1 was NOT saved (atomic rollback)
    assert repo.get_chunk("org-1", "c1") is None

def test_ingestion_job_transitions(repo, db_session):
    source = KnowledgeSource(
        id="src-job", organization_id="org-1", title="T", source_type="doc",
        original_filename="a", stored_filename="a", content_hash="h-job", mime_type="a", file_size=1,
        rights_status="permission_confirmed", source_status="active", source_series_id="s-job"
    )
    repo.create_source(source)
    db_session.commit()
    
    # Add ingestion job manually for testing
    from app.db.models import IngestionJob
    job = IngestionJob(id="job-1", organization_id="org-1", source_id="src-job", status="pending")
    db_session.add(job)
    db_session.commit()
    
    # Invalid transition
    with pytest.raises(ValueError, match="Invalid transition"):
        repo.update_ingestion_job_status("org-1", "job-1", "completed")
        
    # Valid transition
    assert repo.update_ingestion_job_status("org-1", "job-1", "processing") is True
    
    # Verify
    db_session.refresh(job)
    assert job.status == "processing"
    
    # Valid transition to failed
    assert repo.update_ingestion_job_status("org-1", "job-1", "failed", "error occurred") is True
    db_session.refresh(job)
    assert job.status == "failed"
    assert job.error_message == "error occurred"
