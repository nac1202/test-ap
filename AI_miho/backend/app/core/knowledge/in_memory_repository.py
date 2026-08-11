import threading
from typing import List, Optional, Dict
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, KnowledgeChunk
from app.core.knowledge.repository import KnowledgeRepository

class InMemoryKnowledgeRepository(KnowledgeRepository):
    """
    An in-memory implementation of KnowledgeRepository for testing and PoC.
    Ensures organization isolation and transactional version replacement.
    """
    def __init__(self):
        # Maps organization_id -> { source_id -> KnowledgeSource }
        self._sources: Dict[str, Dict[str, KnowledgeSource]] = {}
        # Maps source_id -> KnowledgeDocument
        self._documents: Dict[str, KnowledgeDocument] = {}
        # Maps source_id -> List[KnowledgeChunk]
        self._chunks: Dict[str, List[KnowledgeChunk]] = {}
        self._lock = threading.RLock()

    def _ensure_org(self, organization_id: str):
        if organization_id not in self._sources:
            self._sources[organization_id] = {}

    def create_source(self, source: KnowledgeSource) -> KnowledgeSource:
        with self._lock:
            self._ensure_org(source.organization_id)
            self._sources[source.organization_id][source.id] = source
            return source

    def get_source(self, organization_id: str, source_id: str) -> Optional[KnowledgeSource]:
        with self._lock:
            return self._sources.get(organization_id, {}).get(source_id)

    def find_by_binary_hash(self, organization_id: str, content_hash: str) -> List[KnowledgeSource]:
        with self._lock:
            org_sources = self._sources.get(organization_id, {})
            return [s for s in org_sources.values() if s.content_hash == content_hash]

    def find_by_normalized_hash(self, organization_id: str, normalized_hash: str) -> List[KnowledgeDocument]:
        with self._lock:
            # First, get all sources in this org to find valid source_ids
            org_source_ids = set(self._sources.get(organization_id, {}).keys())
            
            # Now find documents that belong to these sources and match the hash
            import hashlib
            results = []
            for doc in self._documents.values():
                if doc.source_id in org_source_ids:
                    doc_hash = hashlib.sha256(doc.normalized_text.encode('utf-8')).hexdigest()
                    if doc_hash == normalized_hash:
                        results.append(doc)
            return results

    def list_versions(self, organization_id: str, source_series_id: str) -> List[KnowledgeSource]:
        with self._lock:
            org_sources = self._sources.get(organization_id, {})
            # A simple implementation traversing previous_version_id chain
            versions = []
            
            # Find the root or any node in the series. Since this is in-memory and we 
            # don't have a real source_series_id column yet, we'll traverse by linking.
            # In a real DB, we'd have a series_id.
            # For now, we return all sources that are linked to this ID in either direction.
            # (Simplified for PoC)
            
            def get_all_linked(start_id):
                visited = set()
                queue = [start_id]
                while queue:
                    curr_id = queue.pop(0)
                    if curr_id in visited:
                        continue
                    visited.add(curr_id)
                    curr = org_sources.get(curr_id)
                    if not curr:
                        continue
                    versions.append(curr)
                    if curr.previous_version_id:
                        queue.append(curr.previous_version_id)
                    # Find any source whose previous_version_id is curr.id
                    for s in org_sources.values():
                        if s.previous_version_id == curr.id and s.id not in visited:
                            queue.append(s.id)
                            
            get_all_linked(source_series_id)
            return versions

    def create_document(self, document: KnowledgeDocument) -> KnowledgeDocument:
        with self._lock:
            self._documents[document.source_id] = document
            return document

    def create_chunks(self, chunks: List[KnowledgeChunk]) -> List[KnowledgeChunk]:
        with self._lock:
            if not chunks:
                return []
            
            source_id = chunks[0].source_id
            if source_id not in self._chunks:
                self._chunks[source_id] = []
                
            self._chunks[source_id].extend(chunks)
            return chunks

    def replace_current_version(self, organization_id: str, previous_version_id: str, new_source: KnowledgeSource) -> KnowledgeSource:
        with self._lock:
            self._ensure_org(organization_id)
            org_sources = self._sources[organization_id]
            
            # Atomically update the old version and insert the new version
            prev_source = org_sources.get(previous_version_id)
            if prev_source:
                prev_source.is_current = False
                
            new_source.previous_version_id = previous_version_id
            new_source.is_current = True
            org_sources[new_source.id] = new_source
            
            return new_source

    def delete_source(self, organization_id: str, source_id: str) -> bool:
        with self._lock:
            if organization_id in self._sources and source_id in self._sources[organization_id]:
                del self._sources[organization_id][source_id]
                
                # Cleanup associated docs and chunks
                if source_id in self._documents:
                    del self._documents[source_id]
                if source_id in self._chunks:
                    del self._chunks[source_id]
                    
                return True
            return False

    def list_chunks_by_source(self, organization_id: str, source_id: str) -> List[KnowledgeChunk]:
        with self._lock:
            # First verify org ownership
            if source_id not in self._sources.get(organization_id, {}):
                return []
            
            # Return a copy to prevent external mutation
            return list(self._chunks.get(source_id, []))

    # ---- Added dummy implementations for new abstract methods ----

    def create_transcript_cues(self, cues: List[Any]) -> List[Any]:
        return cues

    def disable_source(self, organization_id: str, source_id: str) -> bool:
        return True

    def get_adjacent_chunks(self, organization_id: str, chunk_id: str, before: int = 1, after: int = 1) -> List[KnowledgeChunk]:
        return []

    def get_chunk(self, organization_id: str, chunk_id: str) -> Optional[KnowledgeChunk]:
        return None

    def get_chunk_ids_by_faiss_ids(self, faiss_ids: List[int]) -> Dict[int, str]:
        return {}

    def get_eligible_chunk_ids(self, organization_id: str) -> List[str]:
        return []

    def get_or_create_faiss_id(self, chunk_id: str) -> int:
        return 1

    def list_eligible_sources(self, organization_id: str) -> List[KnowledgeSource]:
        return []

    def update_ingestion_job_status(self, job_id: str, status: str, error_message: str = None) -> bool:
        return True

