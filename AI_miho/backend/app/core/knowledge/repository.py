from abc import ABC, abstractmethod
from typing import List, Optional
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, KnowledgeChunk

class KnowledgeRepository(ABC):
    @abstractmethod
    def create_source(self, source: KnowledgeSource) -> KnowledgeSource:
        pass

    @abstractmethod
    def get_source(self, organization_id: str, source_id: str) -> Optional[KnowledgeSource]:
        pass

    @abstractmethod
    def find_by_binary_hash(self, organization_id: str, content_hash: str) -> List[KnowledgeSource]:
        pass

    @abstractmethod
    def find_by_normalized_hash(self, organization_id: str, normalized_hash: str) -> List[KnowledgeDocument]:
        pass

    @abstractmethod
    def list_versions(self, organization_id: str, source_series_id: str) -> List[KnowledgeSource]:
        """List all versions related to the same logical source."""
        pass

    @abstractmethod
    def create_document(self, document: KnowledgeDocument) -> KnowledgeDocument:
        pass

    @abstractmethod
    def create_chunks(self, chunks: List[KnowledgeChunk]) -> List[KnowledgeChunk]:
        pass

    @abstractmethod
    def replace_current_version(self, organization_id: str, previous_version_id: str, new_source: KnowledgeSource) -> KnowledgeSource:
        """Atomically set previous_version_id's is_current to False and create new_source."""
        pass

    @abstractmethod
    def delete_source(self, organization_id: str, source_id: str) -> bool:
        pass
    @abstractmethod
    def create_transcript_cues(self, cues: List[TranscriptCue]) -> List[TranscriptCue]:
        pass

    @abstractmethod
    def get_chunk(self, organization_id: str, chunk_id: str) -> Optional[KnowledgeChunk]:
        pass

    @abstractmethod
    def get_adjacent_chunks(self, organization_id: str, chunk_id: str, forward: int = 1, backward: int = 1) -> List[KnowledgeChunk]:
        pass

    @abstractmethod
    def disable_source(self, organization_id: str, source_id: str) -> bool:
        pass

    @abstractmethod
    def list_eligible_sources(self, organization_id: str) -> List[KnowledgeSource]:
        pass
    @abstractmethod
    def list_chunks_by_source(self, organization_id: str, source_id: str) -> List[KnowledgeChunk]:
        pass

    @abstractmethod
    def update_ingestion_job_status(self, organization_id: str, job_id: str, new_status: str, error_message: Optional[str] = None) -> bool:
        """Update job status ensuring valid transitions."""
        pass

    @abstractmethod
    def get_or_create_faiss_id(self, chunk_id: str) -> int:
        pass

    @abstractmethod
    def get_chunk_ids_by_faiss_ids(self, faiss_ids: List[int]) -> Dict[int, str]:
        pass

    @abstractmethod
    def get_eligible_chunk_ids(self, organization_id: str) -> List[str]:
        """Returns list of chunk_ids that meet the current eligibility criteria."""
        pass
