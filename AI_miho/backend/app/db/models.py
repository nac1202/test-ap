import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint, Enum as SQLEnum, Text, JSON
from sqlalchemy.orm import relationship
from .base import Base

def utc_now():
    return datetime.now(timezone.utc)

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    
    rights_status = Column(String(50), nullable=False)
    permission_valid_from = Column(DateTime(timezone=True), nullable=True)
    permission_valid_until = Column(DateTime(timezone=True), nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    source_status = Column(String(50), nullable=False)
    
    version = Column(Integer, default=1, nullable=False)
    previous_version_id = Column(String(36), ForeignKey("knowledge_sources.id", ondelete="SET NULL"), nullable=True)
    is_current = Column(Boolean, default=True, nullable=False)
    source_series_id = Column(String(36), nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    # 複合制約
    __table_args__ = (
        UniqueConstraint('organization_id', 'source_series_id', 'version', name='uq_org_series_version'),
    )

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    normalized_text = Column(Text, nullable=False)
    normalized_hash = Column(String(64), nullable=True, index=True)
    character_count = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class TranscriptCue(Base):
    __tablename__ = "transcript_cues"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    original_index = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    speaker = Column(String(100), nullable=True)
    text = Column(Text, nullable=False)
    content_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_type = Column(String(50), nullable=False)
    text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    character_count = Column(Integer, nullable=False)
    content_hash = Column(String(64), nullable=False)
    
    heading_path = Column(JSON, nullable=True)
    page_start = Column(Integer, nullable=True)
    page_end = Column(Integer, nullable=True)
    timestamp_start = Column(Float, nullable=True)
    timestamp_end = Column(Float, nullable=True)
    included_cue_ids = Column(JSON, nullable=True)
    
    previous_chunk_id = Column(String(36), ForeignKey("knowledge_chunks.id", ondelete="SET NULL"), nullable=True)
    next_chunk_id = Column(String(36), ForeignKey("knowledge_chunks.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint('organization_id', 'source_id', 'chunk_index', name='uq_org_source_chunk'),
    )

class KnowledgeCard(Base):
    __tablename__ = "knowledge_cards"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    rule_name = Column(String(255), nullable=False)
    principle = Column(Text, nullable=False)
    problem_pattern = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    after_state = Column(Text, nullable=True)
    applicable_document_types = Column(JSON, nullable=True)
    exceptions = Column(Text, nullable=True)
    source_document = Column(String(255), nullable=False)
    source_page = Column(Integer, nullable=True)
    source_chunk_ids = Column(JSON, nullable=True)
    source_visual_refs = Column(JSON, nullable=True)
    source_type = Column(String(50), nullable=False, default="general_reference")
    source_priority = Column(Integer, nullable=False, default=3)
    confidence = Column(Float, nullable=False, default=1.0)
    rights_status = Column(String(50), nullable=False)
    revision_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class EmbeddingModel(Base):
    __tablename__ = "embedding_models"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(100), nullable=False)
    model_id = Column(String(255), nullable=False, unique=True)
    revision = Column(String(255), nullable=True)
    dimension = Column(Integer, nullable=False)
    license = Column(String(100), nullable=True)
    commercial_use_status = Column(String(50), nullable=True)
    local_path = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class KnowledgeEmbedding(Base):
    __tablename__ = "knowledge_embeddings"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_id = Column(String(36), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=False)
    embedding_model_id = Column(String(36), ForeignKey("embedding_models.id", ondelete="CASCADE"), nullable=False)
    is_stale = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'chunk_id', 'embedding_model_id', name='uq_org_chunk_model'),
    )

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending") # pending, processing, completed, failed, stale
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class ChunkFaissMapping(Base):
    """Map string UUIDs to integer IDs for FAISS."""
    __tablename__ = "chunk_faiss_mappings"
    faiss_id = Column(Integer, primary_key=True, autoincrement=True)
    chunk_id = Column(String(36), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), unique=True, nullable=False)

class FaissIndexMetadata(Base):
    """Metadata for organization-level FAISS indices."""
    __tablename__ = "faiss_index_metadata"
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    embedding_model_id = Column(String(36), ForeignKey("embedding_models.id", ondelete="CASCADE"), primary_key=True)
    index_version = Column(Integer, default=1, nullable=False)
    index_checksum = Column(String(64), nullable=True)
    vector_count = Column(Integer, default=0, nullable=False)
    built_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    build_status = Column(String(50), nullable=False, default="active") # active, rebuilding, failed

class RagAuditLog(Base):
    __tablename__ = "rag_audit_logs"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    request_id = Column(String(36), nullable=False, default=generate_uuid, index=True)
    user_id = Column(String(36), nullable=True)
    status = Column(String(50), nullable=False) # success, no_evidence, parse_error, hallucination, error
    question_hash = Column(String(64), nullable=True)
    answer_hash = Column(String(64), nullable=True)
    model_id = Column(String(255), nullable=True)
    model_digest = Column(String(255), nullable=True)
    embedding_model_id = Column(String(36), nullable=True)
    prompt_version = Column(String(50), nullable=True)
    prompt_hash = Column(String(64), nullable=True)
    retrieval_config = Column(JSON, nullable=True)
    selected_chunk_ids = Column(JSON, nullable=True)
    citation_ids = Column(JSON, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    latency_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

from sqlalchemy import DDL, event

# FTS5 Virtual Table (通常方式・trigram)
fts_create_ddl = DDL("""
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts USING fts5(
    chunk_id UNINDEXED,
    text,
    heading,
    chapter,
    section,
    tokenize='trigram'
);
""")

fts_insert_trigger = DDL("""
CREATE TRIGGER IF NOT EXISTS knowledge_chunks_ai AFTER INSERT ON knowledge_chunks
BEGIN
    INSERT INTO knowledge_chunks_fts (chunk_id, text, heading, chapter, section) 
    VALUES (
        new.id, 
        new.text, 
        new.heading_path, 
        json_extract(new.heading_path, '$[0]'), 
        json_extract(new.heading_path, '$[1]')
    );
END;
""")

fts_delete_trigger = DDL("""
CREATE TRIGGER IF NOT EXISTS knowledge_chunks_ad AFTER DELETE ON knowledge_chunks
BEGIN
    DELETE FROM knowledge_chunks_fts WHERE chunk_id = old.id;
END;
""")

fts_update_trigger = DDL("""
CREATE TRIGGER IF NOT EXISTS knowledge_chunks_au AFTER UPDATE ON knowledge_chunks
BEGIN
    DELETE FROM knowledge_chunks_fts WHERE chunk_id = old.id;
    INSERT INTO knowledge_chunks_fts (chunk_id, text, heading, chapter, section) 
    VALUES (
        new.id, 
        new.text, 
        new.heading_path, 
        json_extract(new.heading_path, '$[0]'), 
        json_extract(new.heading_path, '$[1]')
    );
END;
""")

event.listen(KnowledgeChunk.__table__, 'after_create', fts_create_ddl)
event.listen(KnowledgeChunk.__table__, 'after_create', fts_insert_trigger)
event.listen(KnowledgeChunk.__table__, 'after_create', fts_delete_trigger)
event.listen(KnowledgeChunk.__table__, 'after_create', fts_update_trigger)
