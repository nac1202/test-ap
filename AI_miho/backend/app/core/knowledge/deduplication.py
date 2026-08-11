from typing import Optional, List, Dict
from app.models.knowledge import DuplicateStatus, KnowledgeSource, KnowledgeDocument
from app.core.knowledge.repository import KnowledgeRepository

class DeduplicationService:
    def __init__(self, repository: KnowledgeRepository):
        self.repository = repository

    def check_duplicate(self, organization_id: str, binary_hash: str, normalized_hash: str, series_id: Optional[str] = None) -> DuplicateStatus:
        """
        Determines the duplicate status of an uploaded file.
        Evaluation order:
        1. Exact binary hash match -> DUPLICATE
        2. Normalized text match -> POSSIBLE_DUPLICATE (format/whitespace might differ but content is same)
        3. series_id match AND text is different -> NEW_VERSION (or POSSIBLE_NEW_VERSION)
        4. Otherwise -> UNIQUE
        """
        # 1. Check exact binary hash in the same organization
        binary_matches = self.repository.find_by_binary_hash(organization_id, binary_hash)
        if binary_matches:
            return DuplicateStatus.DUPLICATE
            
        # 2. Check normalized text hash in the same organization
        normalized_matches = self.repository.find_by_normalized_hash(organization_id, normalized_hash)
        if normalized_matches:
            return DuplicateStatus.POSSIBLE_DUPLICATE
            
        # 3. Check if series_id is provided and already exists (means it's a new version since text didn't match)
        if series_id:
            series_matches = self.repository.list_versions(organization_id, series_id)
            if series_matches:
                return DuplicateStatus.NEW_VERSION
                
        # Title matching alone should NOT trigger auto new version.
        return DuplicateStatus.UNIQUE
