from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid

class RightsStatus(str, Enum):
    UNKNOWN = "unknown"
    UNCONFIRMED = "unconfirmed"
    INTERNAL_RESEARCH = "internal_research"
    PERMISSION_REQUESTED = "permission_requested"
    PERMISSION_CONFIRMED = "permission_confirmed"
    RESTRICTED = "restricted"
    EXPIRED = "expired"
    PROHIBITED = "prohibited"

class SourceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DELETED = "deleted"

class DuplicateStatus(str, Enum):
    DUPLICATE = "duplicate"
    POSSIBLE_DUPLICATE = "possible_duplicate"
    NEW_VERSION = "new_version"
    UNIQUE = "unique"

class KnowledgeSource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    title: str
    author: Optional[str] = None
    source_type: str
    original_filename: str
    stored_filename: str
    content_hash: str
    mime_type: str
    file_size: int
    language: str = "ja"
    book_title: Optional[str] = None
    video_title: Optional[str] = None
    
    # Versioning
    source_series_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: int = 1
    previous_version_id: Optional[str] = None
    is_current: bool = True
    change_summary: Optional[str] = None
    
    # Rights
    rights_status: RightsStatus = RightsStatus.UNCONFIRMED
    permission_scope: Optional[str] = None
    permission_valid_from: Optional[datetime] = None
    permission_valid_until: Optional[datetime] = None
    
    source_status: SourceStatus = SourceStatus.ACTIVE
    is_enabled: bool = False
    
    created_by: str = "system"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    imported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    parser_version: str = "1.0.0"
    parsing_warnings: List[str] = Field(default_factory=list)
    
    @property
    def is_eligible_for_production_rag(self) -> bool:
        if self.rights_status != RightsStatus.PERMISSION_CONFIRMED:
            return False
        if not self.is_enabled:
            return False
        if self.source_status != SourceStatus.ACTIVE:
            return False
            
        now = datetime.now(timezone.utc)
        if self.permission_valid_from and now < self.permission_valid_from:
            return False
        if self.permission_valid_until and now > self.permission_valid_until:
            return False
            
        return True

class KnowledgeDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str = ""
    source_id: str
    normalized_text: str = Field(repr=False)
    normalized_hash: Optional[str] = None
    character_count: int
    page_count: Optional[int] = None
    section_count: Optional[int] = None
    parsing_status: str = "completed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TranscriptCue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str = ""
    source_id: str
    original_index: int
    start_time: float
    end_time: float
    speaker: Optional[str] = None
    text: str = Field(repr=False)
    content_hash: str
    warnings: List[str] = Field(default_factory=list)

class KnowledgeChunk(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str = ""
    source_id: str
    document_id: Optional[str] = None
    chunk_index: int
    chunk_type: str = "paragraph"
    text: str = Field(repr=False)
    token_count: int
    character_count: int
    
    chapter: Optional[str] = None
    section: Optional[str] = None
    heading_path: List[str] = Field(default_factory=list)
    
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    included_cue_ids: List[str] = Field(default_factory=list)
    
    previous_chunk_id: Optional[str] = None
    next_chunk_id: Optional[str] = None
    
    content_hash: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KnowledgeCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    category: str
    rule_name: str
    principle: str
    problem_pattern: Optional[str] = None
    reason: Optional[str] = None
    recommended_action: Optional[str] = None
    after_state: Optional[str] = None
    applicable_document_types: List[str] = Field(default_factory=list)
    exceptions: Optional[str] = None
    source_document: str
    source_page: Optional[int] = None
    source_chunk_ids: List[str] = Field(default_factory=list)
    source_visual_refs: List[str] = Field(default_factory=list)
    source_type: str = "general_reference"  # yamahashi_direct, supervised_material, general_reference
    source_priority: int = 3
    confidence: float = 1.0
    rights_status: RightsStatus = RightsStatus.UNCONFIRMED
    revision_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
