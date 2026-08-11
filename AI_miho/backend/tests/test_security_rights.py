import pytest
from datetime import datetime, timezone, timedelta
from app.models.knowledge import KnowledgeSource, RightsStatus, SourceStatus, KnowledgeDocument, KnowledgeChunk

def test_rights_eligibility_comprehensive():
    # Base source that is fully eligible
    now = datetime.now(timezone.utc)
    
    s = KnowledgeSource(
        organization_id="org1",
        title="Title",
        source_type="text",
        original_filename="a.txt",
        stored_filename="a.txt",
        content_hash="hash",
        mime_type="text/plain",
        file_size=10,
        rights_status=RightsStatus.PERMISSION_CONFIRMED,
        is_enabled=True,
        source_status=SourceStatus.ACTIVE,
        permission_valid_from=now - timedelta(days=1),
        permission_valid_until=now + timedelta(days=1)
    )
    
    # 1. Fully eligible
    assert s.is_eligible_for_production_rag is True
    
    # 2. unconfirmed
    s.rights_status = RightsStatus.UNCONFIRMED
    assert s.is_eligible_for_production_rag is False
    s.rights_status = RightsStatus.PERMISSION_CONFIRMED
    
    # 3. restricted
    s.rights_status = RightsStatus.RESTRICTED
    assert s.is_eligible_for_production_rag is False
    s.rights_status = RightsStatus.PERMISSION_CONFIRMED
    
    # 4. expired
    s.rights_status = RightsStatus.EXPIRED
    assert s.is_eligible_for_production_rag is False
    s.rights_status = RightsStatus.PERMISSION_CONFIRMED
    
    # 5. prohibited
    s.rights_status = RightsStatus.PROHIBITED
    assert s.is_eligible_for_production_rag is False
    s.rights_status = RightsStatus.PERMISSION_CONFIRMED
    
    # 6. is_enabled = False
    s.is_enabled = False
    assert s.is_eligible_for_production_rag is False
    s.is_enabled = True
    
    # 7. source_status = inactive
    s.source_status = SourceStatus.INACTIVE
    assert s.is_eligible_for_production_rag is False
    s.source_status = SourceStatus.ACTIVE
    
    # 8. Before valid_from
    s.permission_valid_from = now + timedelta(days=1)
    assert s.is_eligible_for_production_rag is False
    s.permission_valid_from = None
    
    # 9. After valid_until
    s.permission_valid_until = now - timedelta(days=1)
    assert s.is_eligible_for_production_rag is False
    s.permission_valid_until = None
    
    # 10. valid_from / valid_until are None (unlimited)
    assert s.is_eligible_for_production_rag is True

def test_repr_hides_raw_text():
    # Ensure that raw text doesn't leak into logs via repr()
    doc = KnowledgeDocument(
        source_id="src1",
        normalized_text="SECRET_CONTENT",
        character_count=14
    )
    
    chunk = KnowledgeChunk(
        source_id="src1",
        chunk_index=0,
        text="SECRET_CHUNK",
        token_count=10,
        character_count=12,
        content_hash="hash"
    )
    
    doc_repr = repr(doc)
    chunk_repr = repr(chunk)
    
    assert "SECRET_CONTENT" not in doc_repr
    assert "SECRET_CHUNK" not in chunk_repr
