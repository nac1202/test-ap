import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, update

from app.core.knowledge.repository import KnowledgeRepository
from app.models.knowledge import (
    KnowledgeSource, KnowledgeDocument, KnowledgeChunk, TranscriptCue
)
from app.db.models import (
    KnowledgeSource as DBSource,
    KnowledgeDocument as DBDocument,
    KnowledgeChunk as DBChunk,
    TranscriptCue as DBCue,
    Organization as DBOrg
)

class SQLAlchemyKnowledgeRepository(KnowledgeRepository):
    def __init__(self, session: Session):
        self.session = session
        
    def _base_query(self, model, organization_id: str):
        return select(model).where(model.organization_id == organization_id)
        
    def _verify_source_org(self, organization_id: str, source_id: str) -> None:
        # Check if source exists and belongs to the org
        stmt = self._base_query(DBSource, organization_id).where(DBSource.id == source_id)
        if not self.session.execute(stmt).scalar_one_or_none():
            raise ValueError(f"Source {source_id} does not belong to organization {organization_id}")
        
    def _to_pydantic_source(self, db_obj: DBSource) -> KnowledgeSource:
        return KnowledgeSource(
            id=db_obj.id,
            organization_id=db_obj.organization_id,
            title=db_obj.title,
            source_type=db_obj.source_type,
            original_filename=db_obj.original_filename,
            stored_filename=db_obj.stored_filename,
            content_hash=db_obj.content_hash,
            mime_type=db_obj.mime_type,
            file_size=db_obj.file_size,
            rights_status=db_obj.rights_status,
            permission_valid_from=db_obj.permission_valid_from,
            permission_valid_until=db_obj.permission_valid_until,
            is_enabled=db_obj.is_enabled,
            source_status=db_obj.source_status,
            version=db_obj.version,
            previous_version_id=db_obj.previous_version_id,
            is_current=db_obj.is_current,
            source_series_id=db_obj.source_series_id,
            created_at=db_obj.created_at,
            updated_at=db_obj.updated_at
        )

    def _to_pydantic_document(self, db_obj: DBDocument) -> KnowledgeDocument:
        return KnowledgeDocument(
            id=db_obj.id,
            organization_id=db_obj.organization_id,
            source_id=db_obj.source_id,
            normalized_text=db_obj.normalized_text,
            character_count=db_obj.character_count,
            created_at=db_obj.created_at
        )

    def _to_pydantic_chunk(self, db_obj: DBChunk) -> KnowledgeChunk:
        return KnowledgeChunk(
            id=db_obj.id,
            organization_id=db_obj.organization_id,
            source_id=db_obj.source_id,
            chunk_index=db_obj.chunk_index,
            chunk_type=db_obj.chunk_type,
            text=db_obj.text,
            token_count=db_obj.token_count,
            character_count=db_obj.character_count,
            content_hash=db_obj.content_hash,
            heading_path=db_obj.heading_path,
            page_start=db_obj.page_start,
            page_end=db_obj.page_end,
            timestamp_start=db_obj.timestamp_start,
            timestamp_end=db_obj.timestamp_end,
            included_cue_ids=db_obj.included_cue_ids,
            created_at=db_obj.created_at
        )

    def _to_pydantic_cue(self, db_obj: DBCue) -> TranscriptCue:
        return TranscriptCue(
            id=db_obj.id,
            organization_id=db_obj.organization_id,
            source_id=db_obj.source_id,
            original_index=db_obj.original_index,
            start_time=db_obj.start_time,
            end_time=db_obj.end_time,
            speaker=db_obj.speaker,
            text=db_obj.text,
            content_hash=db_obj.content_hash,
            created_at=db_obj.created_at
        )

    def create_source(self, source: KnowledgeSource) -> KnowledgeSource:
        # Ensure org exists
        org = self.session.execute(select(DBOrg).where(DBOrg.id == source.organization_id)).scalar_one_or_none()
        if not org:
            org = DBOrg(id=source.organization_id, name=f"Org {source.organization_id}")
            self.session.add(org)
            self.session.flush()

        db_source = DBSource(
            id=source.id,
            organization_id=source.organization_id,
            title=source.title,
            source_type=source.source_type,
            original_filename=source.original_filename,
            stored_filename=source.stored_filename,
            content_hash=source.content_hash,
            mime_type=source.mime_type,
            file_size=source.file_size,
            rights_status=source.rights_status,
            permission_valid_from=source.permission_valid_from,
            permission_valid_until=source.permission_valid_until,
            is_enabled=source.is_enabled,
            source_status=source.source_status,
            version=source.version,
            previous_version_id=source.previous_version_id,
            is_current=source.is_current,
            source_series_id=source.source_series_id,
            created_at=source.created_at,
            updated_at=source.updated_at
        )
        self.session.add(db_source)
        self.session.flush()
        return self._to_pydantic_source(db_source)

    def get_source(self, organization_id: str, source_id: str) -> Optional[KnowledgeSource]:
        stmt = self._base_query(DBSource, organization_id).where(DBSource.id == source_id)
        db_source = self.session.execute(stmt).scalar_one_or_none()
        if db_source:
            return self._to_pydantic_source(db_source)
        return None

    def find_by_binary_hash(self, organization_id: str, content_hash: str) -> List[KnowledgeSource]:
        stmt = self._base_query(DBSource, organization_id).where(DBSource.content_hash == content_hash)
        return [self._to_pydantic_source(s) for s in self.session.execute(stmt).scalars().all()]

    def find_by_normalized_hash(self, organization_id: str, content_hash: str) -> List[KnowledgeDocument]:
        stmt = self._base_query(DBDocument, organization_id).join(DBSource).where(
            DBDocument.normalized_hash == content_hash,
            DBSource.is_current == True
        )
        return [self._to_pydantic_document(d) for d in self.session.execute(stmt).scalars().all()]

    def list_versions(self, organization_id: str, series_id: str) -> List[KnowledgeSource]:
        stmt = self._base_query(DBSource, organization_id).where(
            DBSource.source_series_id == series_id
        ).order_by(DBSource.version.desc())
        return [self._to_pydantic_source(db_s) for db_s in self.session.execute(stmt).scalars().all()]

    def create_document(self, document: KnowledgeDocument) -> KnowledgeDocument:
        self._verify_source_org(document.organization_id, document.source_id)
        db_doc = DBDocument(
            id=document.id,
            organization_id=document.organization_id,
            source_id=document.source_id,
            normalized_text=document.normalized_text,
            character_count=document.character_count,
            created_at=document.created_at
        )
        self.session.add(db_doc)
        self.session.flush()
        return self._to_pydantic_document(db_doc)

    def create_transcript_cues(self, cues: List[TranscriptCue]) -> List[TranscriptCue]:
        if cues:
            self._verify_source_org(cues[0].organization_id, cues[0].source_id)
        db_cues = []
        for cue in cues:
            db_c = DBCue(
                id=cue.id,
                organization_id=cue.organization_id,
                source_id=cue.source_id,
                original_index=cue.original_index,
                start_time=cue.start_time,
                end_time=cue.end_time,
                speaker=cue.speaker,
                text=cue.text,
                content_hash=cue.content_hash,
                created_at=cue.created_at
            )
            self.session.add(db_c)
            db_cues.append(db_c)
        self.session.flush()
        return [self._to_pydantic_cue(c) for c in db_cues]

    def create_chunks(self, chunks: List[KnowledgeChunk]) -> List[KnowledgeChunk]:
        if chunks:
            self._verify_source_org(chunks[0].organization_id, chunks[0].source_id)
        db_chunks = []
        for chunk in chunks:
            db_c = DBChunk(
                id=chunk.id,
                organization_id=chunk.organization_id,
                source_id=chunk.source_id,
                chunk_index=chunk.chunk_index,
                chunk_type=chunk.chunk_type,
                text=chunk.text,
                token_count=chunk.token_count,
                character_count=chunk.character_count,
                content_hash=chunk.content_hash,
                heading_path=chunk.heading_path,
                page_start=chunk.page_start,
                page_end=chunk.page_end,
                timestamp_start=chunk.timestamp_start,
                timestamp_end=chunk.timestamp_end,
                included_cue_ids=chunk.included_cue_ids,
                created_at=chunk.created_at
            )
            self.session.add(db_c)
            db_chunks.append(db_c)
        self.session.flush()
        
        # Now update previous_chunk_id and next_chunk_id links
        for i in range(len(db_chunks)):
            if i > 0:
                db_chunks[i].previous_chunk_id = db_chunks[i-1].id
            if i < len(db_chunks) - 1:
                db_chunks[i].next_chunk_id = db_chunks[i+1].id
        self.session.flush()
        
        return [self._to_pydantic_chunk(c) for c in db_chunks]

    def get_chunk(self, organization_id: str, chunk_id: str) -> Optional[KnowledgeChunk]:
        stmt = self._base_query(DBChunk, organization_id).where(DBChunk.id == chunk_id)
        db_chunk = self.session.execute(stmt).scalar_one_or_none()
        if db_chunk:
            return self._to_pydantic_chunk(db_chunk)
        return None

    def get_adjacent_chunks(self, organization_id: str, chunk_id: str, forward: int = 1, backward: int = 1) -> List[KnowledgeChunk]:
        # Simple implementation for Step 4A
        chunk = self.get_chunk(organization_id, chunk_id)
        if not chunk:
            return []
        
        stmt = self._base_query(DBChunk, organization_id).where(
            DBChunk.source_id == chunk.source_id,
            DBChunk.chunk_index >= chunk.chunk_index - backward,
            DBChunk.chunk_index <= chunk.chunk_index + forward
        ).order_by(DBChunk.chunk_index)
        
        return [self._to_pydantic_chunk(c) for c in self.session.execute(stmt).scalars().all()]

    def list_chunks_by_source(self, organization_id: str, source_id: str) -> List[KnowledgeChunk]:
        stmt = self._base_query(DBChunk, organization_id).where(DBChunk.source_id == source_id).order_by(DBChunk.chunk_index)
        return [self._to_pydantic_chunk(c) for c in self.session.execute(stmt).scalars().all()]

    def replace_current_version(self, organization_id: str, previous_version_id: str, new_source: KnowledgeSource) -> KnowledgeSource:
        stmt_old = self._base_query(DBSource, organization_id).where(DBSource.id == previous_version_id).with_for_update()
        old_source = self.session.execute(stmt_old).scalar_one_or_none()
        
        if old_source:
            old_source.is_current = False
            
        # create new_source directly using existing logic
        return self.create_source(new_source)

    def disable_source(self, organization_id: str, source_id: str) -> bool:
        stmt = self._base_query(DBSource, organization_id).where(DBSource.id == source_id).with_for_update()
        db_source = self.session.execute(stmt).scalar_one_or_none()
        if db_source:
            db_source.is_enabled = False
            self.session.flush()
            return True
        return False

    def delete_source(self, organization_id: str, source_id: str) -> bool:
        stmt = self._base_query(DBSource, organization_id).where(DBSource.id == source_id)
        db_source = self.session.execute(stmt).scalar_one_or_none()
        if db_source:
            self.session.delete(db_source)
            self.session.flush()
            return True
        return False

    def list_eligible_sources(self, organization_id: str) -> List[KnowledgeSource]:
        now = datetime.now(timezone.utc)
        stmt = self._base_query(DBSource, organization_id).where(
            DBSource.is_current == True,
            DBSource.is_enabled == True,
            DBSource.source_status == "active",
            DBSource.rights_status == "permission_confirmed",
            or_(DBSource.permission_valid_from == None, DBSource.permission_valid_from <= now),
            or_(DBSource.permission_valid_until == None, DBSource.permission_valid_until > now)
        )
        return [self._to_pydantic_source(s) for s in self.session.execute(stmt).scalars().all()]

    def update_ingestion_job_status(self, organization_id: str, job_id: str, new_status: str, error_message: Optional[str] = None) -> bool:
        from app.db.models import IngestionJob
        stmt = self._base_query(IngestionJob, organization_id).where(IngestionJob.id == job_id).with_for_update()
        job = self.session.execute(stmt).scalar_one_or_none()
        
        if not job:
            return False
            
        valid_transitions = {
            "pending": ["processing"],
            "processing": ["completed", "failed"],
            "completed": ["stale"],
            "failed": ["pending"]
        }
        
        if new_status not in valid_transitions.get(job.status, []):
            raise ValueError(f"Invalid transition from {job.status} to {new_status}")
            
        job.status = new_status
        if error_message:
            job.error_message = error_message
            
        self.session.flush()
        return True

    def get_or_create_faiss_id(self, chunk_id: str) -> int:
        from app.db.models import ChunkFaissMapping
        from sqlalchemy.exc import IntegrityError
        
        stmt = select(ChunkFaissMapping).where(ChunkFaissMapping.chunk_id == chunk_id)
        mapping = self.session.execute(stmt).scalar_one_or_none()
        
        if mapping:
            return mapping.faiss_id
            
        try:
            new_mapping = ChunkFaissMapping(chunk_id=chunk_id)
            self.session.add(new_mapping)
            self.session.flush()
            return new_mapping.faiss_id
        except IntegrityError:
            self.session.rollback()
            mapping = self.session.execute(stmt).scalar_one_or_none()
            return mapping.faiss_id

    def get_chunk_ids_by_faiss_ids(self, faiss_ids: List[int]) -> Dict[int, str]:
        from app.db.models import ChunkFaissMapping
        if not faiss_ids:
            return {}
        stmt = select(ChunkFaissMapping).where(ChunkFaissMapping.faiss_id.in_(faiss_ids))
        mappings = self.session.execute(stmt).scalars().all()
        return {m.faiss_id: m.chunk_id for m in mappings}

    def get_eligible_chunk_ids(self, organization_id: str) -> List[str]:
        now = datetime.now(timezone.utc)
        stmt = select(DBChunk.id).join(DBSource).where(
            DBChunk.organization_id == organization_id,
            DBSource.is_current == True,
            DBSource.is_enabled == True,
            DBSource.source_status == "active",
            DBSource.rights_status == "permission_confirmed",
            or_(DBSource.permission_valid_from == None, DBSource.permission_valid_from <= now),
            or_(DBSource.permission_valid_until == None, DBSource.permission_valid_until > now)
        )
        return list(self.session.execute(stmt).scalars().all())
