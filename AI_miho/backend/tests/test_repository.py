import pytest
from app.models.knowledge import KnowledgeSource
from app.core.knowledge.in_memory_repository import InMemoryKnowledgeRepository

def test_repository_organization_isolation():
    repo = InMemoryKnowledgeRepository()
    
    # Org1 source
    s1 = KnowledgeSource(
        organization_id="org1",
        title="Org1 Title",
        source_type="text",
        original_filename="1.txt",
        stored_filename="1.txt",
        content_hash="hash1",
        mime_type="text/plain",
        file_size=10
    )
    repo.create_source(s1)
    
    # Org2 source
    s2 = KnowledgeSource(
        organization_id="org2",
        title="Org2 Title",
        source_type="text",
        original_filename="2.txt",
        stored_filename="2.txt",
        content_hash="hash2",
        mime_type="text/plain",
        file_size=10
    )
    repo.create_source(s2)
    
    # Get tests
    assert repo.get_source("org1", s1.id) is not None
    assert repo.get_source("org2", s1.id) is None
    
    # Delete isolation
    repo.delete_source("org2", s1.id)
    assert repo.get_source("org1", s1.id) is not None # Should still exist
    
def test_repository_replace_version_atomicity():
    repo = InMemoryKnowledgeRepository()
    
    s1 = KnowledgeSource(
        organization_id="org1",
        title="Title",
        source_type="text",
        original_filename="1.txt",
        stored_filename="1.txt",
        content_hash="hash1",
        mime_type="text/plain",
        file_size=10,
        is_current=True
    )
    s1 = repo.create_source(s1)
    
    s2 = KnowledgeSource(
        organization_id="org1",
        title="Title V2",
        source_type="text",
        original_filename="1.txt",
        stored_filename="2.txt",
        content_hash="hash2",
        mime_type="text/plain",
        file_size=12
    )
    
    repo.replace_current_version("org1", s1.id, s2)
    
    # Verify atomicity
    old_s1 = repo.get_source("org1", s1.id)
    new_s2 = repo.get_source("org1", s2.id)
    
    assert old_s1.is_current is False
    assert new_s2.is_current is True
    assert new_s2.previous_version_id == s1.id
