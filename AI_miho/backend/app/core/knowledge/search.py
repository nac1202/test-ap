import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.core.knowledge.repository import KnowledgeRepository
from app.core.knowledge.embedding import EmbeddingProvider
from app.core.knowledge.keyword_search import KeywordSearchProvider
from app.core.knowledge.faiss_manager import FaissManager
from app.db.models import KnowledgeChunk, KnowledgeSource

logger = logging.getLogger(__name__)

class SearchResultItem:
    def __init__(self, 
                 chunk_id: str, 
                 source_id: str, 
                 keyword_rank: Optional[int], 
                 vector_rank: Optional[int], 
                 rrf_score: float, 
                 vector_score: Optional[float],
                 retrieval_method: str,
                 source_title: str,
                 author: Optional[str],
                 chapter: Optional[str],
                 section: Optional[str],
                 page_start: Optional[int],
                 page_end: Optional[int],
                 video_title: Optional[str],
                 timestamp_start: Optional[float],
                 timestamp_end: Optional[float],
                 source_version: int,
                 snippet: str):
        self.chunk_id = chunk_id
        self.source_id = source_id
        self.keyword_rank = keyword_rank
        self.vector_rank = vector_rank
        self.rrf_score = rrf_score
        self.vector_score = vector_score
        self.retrieval_method = retrieval_method
        self.source_title = source_title
        self.author = author
        self.chapter = chapter
        self.section = section
        self.page_start = page_start
        self.page_end = page_end
        self.video_title = video_title
        self.timestamp_start = timestamp_start
        self.timestamp_end = timestamp_end
        self.source_version = source_version
        self.snippet = snippet

class SearchService:
    def __init__(self, 
                 repository: KnowledgeRepository, 
                 embedding_provider: EmbeddingProvider, 
                 keyword_provider: KeywordSearchProvider, 
                 faiss_manager: FaissManager,
                 session_factory):
        self.repository = repository
        self.embedding_provider = embedding_provider
        self.keyword_provider = keyword_provider
        self.faiss_manager = faiss_manager
        self.session_factory = session_factory

    def _truncate_snippet(self, text: str, max_chars: int = 200) -> str:
        if len(text) <= max_chars:
            return text
        return text[:max_chars].strip() + "..."

    def search(self, organization_id: str, query: str, limit: int = 10, rrf_k: int = 60) -> List[SearchResultItem]:
        # 1. Pre-filter: Get eligible chunk_ids based on DB constraints
        eligible_chunk_ids = self.repository.get_eligible_chunk_ids(organization_id)
        if not eligible_chunk_ids:
            logger.info("No eligible chunks found for pre-filtering.")
            return []

        # We will fetch more candidates than the limit to compute accurate RRF
        candidate_limit = max(limit * 5, 50)

        # 2. Vector Search
        faiss_id_to_chunk_id = {}
        vector_results_dict = {}
        vector_method = "Vector"
        try:
            # Map chunk_ids to faiss_ids for filtering
            faiss_ids = []
            session = self.session_factory()
            try:
                # We do this in bulk via a new method or directly for performance
                # Since get_or_create_faiss_id creates one by one, we should bulk query
                from app.db.models import ChunkFaissMapping
                stmt = select(ChunkFaissMapping).where(ChunkFaissMapping.chunk_id.in_(eligible_chunk_ids))
                mappings = session.execute(stmt).scalars().all()
                for m in mappings:
                    faiss_ids.append(m.faiss_id)
                    faiss_id_to_chunk_id[m.faiss_id] = m.chunk_id
            finally:
                session.close()

            q_vec = self.embedding_provider.embed_query(query)
            faiss_results = self.faiss_manager.search(organization_id, q_vec, limit=candidate_limit, filter_faiss_ids=faiss_ids)
            
            for rank, (faiss_id, score) in enumerate(faiss_results, start=1):
                chunk_id = faiss_id_to_chunk_id.get(faiss_id)
                if chunk_id:
                    vector_results_dict[chunk_id] = {"rank": rank, "score": score}
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            vector_method = "Vector(Failed)"

        # 3. Keyword Search
        keyword_results_dict = {}
        keyword_method = self.keyword_provider.get_method_name()
        try:
            kw_results = self.keyword_provider.search(organization_id, query, limit=candidate_limit, chunk_ids_filter=eligible_chunk_ids)
            for rank, res in enumerate(kw_results, start=1):
                keyword_results_dict[res.chunk_id] = {"rank": rank, "score": res.score}
        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            keyword_method = "Keyword(Failed)"

        # 4. RRF Fusion
        # Score = Σ 1 / (k + rank)
        all_chunk_ids = set(vector_results_dict.keys()).union(set(keyword_results_dict.keys()))
        rrf_scores = {}
        
        for cid in all_chunk_ids:
            score = 0.0
            methods = []
            
            if cid in vector_results_dict:
                vrank = vector_results_dict[cid]["rank"]
                score += 1.0 / (rrf_k + vrank)
                methods.append("Vector")
                
            if cid in keyword_results_dict:
                krank = keyword_results_dict[cid]["rank"]
                score += 1.0 / (rrf_k + krank)
                methods.append(keyword_method)
                
            rrf_scores[cid] = {
                "score": score,
                "method": " + ".join(methods) if len(methods) > 1 else methods[0]
            }

        # Sort by RRF score descending
        sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1]["score"], reverse=True)
        top_chunks = sorted_chunks[:limit]
        
        if not top_chunks:
            return []

        # 5. Post-filter & Hydration
        # Double check the permissions and get metadata
        final_results = []
        top_chunk_ids = [cid for cid, _ in top_chunks]
        
        session = self.session_factory()
        try:
            now = datetime.now(timezone.utc)
            # Re-verify permissions at the exact moment of retrieval
            stmt = select(KnowledgeChunk, KnowledgeSource).join(
                KnowledgeSource, KnowledgeChunk.source_id == KnowledgeSource.id
            ).where(
                KnowledgeChunk.id.in_(top_chunk_ids),
                KnowledgeChunk.organization_id == organization_id,
                KnowledgeSource.is_current == True,
                KnowledgeSource.is_enabled == True,
                KnowledgeSource.rights_status == "permission_confirmed",
                or_(KnowledgeSource.permission_valid_from == None, KnowledgeSource.permission_valid_from <= now),
                or_(KnowledgeSource.permission_valid_until == None, KnowledgeSource.permission_valid_until > now)
            )
            
            records = session.execute(stmt).all()
            
            # Map records for quick lookup
            record_map = {chunk.id: (chunk, source) for chunk, source in records}
            
            for cid, rrf_info in top_chunks:
                if cid not in record_map:
                    # Filtered out during post-filter
                    continue
                    
                chunk, source = record_map[cid]
                
                # Extract meta
                chapter = None
                section = None
                if chunk.heading_path and isinstance(chunk.heading_path, list) and len(chunk.heading_path) > 0:
                    chapter = chunk.heading_path[0]
                    if len(chunk.heading_path) > 1:
                        section = chunk.heading_path[1]
                        
                video_title = source.title if source.source_type == "video" else None
                author = None # Not modeled yet, placeholder
                
                v_rank = vector_results_dict.get(cid, {}).get("rank")
                k_rank = keyword_results_dict.get(cid, {}).get("rank")
                v_score = vector_results_dict.get(cid, {}).get("score")
                
                method_name = rrf_info["method"]
                if "Vector" in method_name and keyword_method in method_name:
                    method_name = "Hybrid"
                
                item = SearchResultItem(
                    chunk_id=chunk.id,
                    source_id=source.id,
                    keyword_rank=k_rank,
                    vector_rank=v_rank,
                    rrf_score=rrf_info["score"],
                    vector_score=v_score,
                    retrieval_method=method_name,
                    source_title=source.title,
                    author=author,
                    chapter=chapter,
                    section=section,
                    page_start=chunk.page_start,
                    page_end=chunk.page_end,
                    video_title=video_title,
                    timestamp_start=chunk.timestamp_start,
                    timestamp_end=chunk.timestamp_end,
                    source_version=source.version,
                    snippet=self._truncate_snippet(chunk.text)
                )
                final_results.append(item)
                
            return final_results
        finally:
            session.close()
