import pytest
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, DuplicateStatus
from app.core.knowledge.in_memory_repository import InMemoryKnowledgeRepository
from app.core.knowledge.deduplication import DeduplicationService

def test_deduplication_precedence():
    repo = InMemoryKnowledgeRepository()
    dedup = DeduplicationService(repo)
    
    # Base source
    s1 = KnowledgeSource(
        organization_id="org1",
        title="Title",
        source_type="text",
        original_filename="a.txt",
        stored_filename="a.txt",
        content_hash="bin_hash1",
        mime_type="text/plain",
        file_size=10
    )
    repo.create_source(s1)
    
    doc1 = KnowledgeDocument(
        source_id=s1.id,
        normalized_text="normal text",
        character_count=11
    )
    repo.create_document(doc1)
    
    # 1. Exact binary match -> DUPLICATE
    status = dedup.check_duplicate("org1", binary_hash="bin_hash1", normalized_hash="some_norm_hash", series_id="some_id")
    assert status == DuplicateStatus.DUPLICATE
    
    # 2. Different binary, but same normalized text -> POSSIBLE_DUPLICATE
    # Calculate hash of "normal text"
    import hashlib
    norm_hash1 = hashlib.sha256("normal text".encode('utf-8')).hexdigest()
    
    status = dedup.check_duplicate("org1", binary_hash="bin_hash2", normalized_hash=norm_hash1, series_id="some_id")
    assert status == DuplicateStatus.POSSIBLE_DUPLICATE
    
    # 3. Different binary, different text, but same series_id -> NEW_VERSION
    # In our simple InMemory list_versions, series_id is just a linked previous_version_id
    # We will use s1.id as the series_id
    status = dedup.check_duplicate("org1", binary_hash="bin_hash3", normalized_hash="norm_hash3", series_id=s1.id)
    assert status == DuplicateStatus.NEW_VERSION
    
    # 4. Different everything -> UNIQUE
    status = dedup.check_duplicate("org1", binary_hash="bin_hash4", normalized_hash="norm_hash4", series_id="non_existent")
    assert status == DuplicateStatus.UNIQUE

def test_deduplication_cross_organization():
    repo = InMemoryKnowledgeRepository()
    dedup = DeduplicationService(repo)
    
    s1 = KnowledgeSource(
        organization_id="org1",
        title="Title",
        source_type="text",
        original_filename="a.txt",
        stored_filename="a.txt",
        content_hash="bin_hash1",
        mime_type="text/plain",
        file_size=10
    )
    repo.create_source(s1)
    
    # Query from org2 with the same binary hash should be UNIQUE because of org isolation
    status = dedup.check_duplicate("org2", binary_hash="bin_hash1", normalized_hash="norm_hash1")
    assert status == DuplicateStatus.UNIQUE
