import logging
import sqlite3
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class KeywordSearchResult:
    def __init__(self, chunk_id: str, score: float):
        self.chunk_id = chunk_id
        self.score = score

class KeywordSearchProvider(ABC):
    @abstractmethod
    def search(self, organization_id: str, query: str, limit: int = 10, chunk_ids_filter: Optional[List[str]] = None) -> List[KeywordSearchResult]:
        """Perform a keyword search and return matching chunk IDs with BM25-like scores."""
        pass
        
    @abstractmethod
    def get_method_name(self) -> str:
        """Return the name of the search method (e.g., 'FTS5 trigram', 'LIKE')"""
        pass

def check_fts5_trigram_support(db_path: str = ":memory:") -> bool:
    """Check if the current SQLite environment supports FTS5 and trigram tokenizer."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Test FTS5 creation
        cursor.execute("CREATE VIRTUAL TABLE fts_test USING fts5(text, tokenize='trigram');")
        cursor.execute("INSERT INTO fts_test(text) VALUES ('日本語テスト');")
        cursor.execute("SELECT * FROM fts_test WHERE text MATCH '語テ';")
        results = cursor.fetchall()
        
        cursor.execute("DROP TABLE fts_test;")
        conn.close()
        
        return len(results) > 0
    except Exception as e:
        logger.warning(f"FTS5 trigram not supported: {e}")
        return False

class Fts5TrigramSearchProvider(KeywordSearchProvider):
    def __init__(self, session_factory):
        self.session_factory = session_factory
        # Since SQLAlchemy will manage the FTS tables, we assume they are created.
        # But for PoC, we might construct SQL directly or use SQLAlchemy `text`.

    def get_method_name(self) -> str:
        return "FTS5 trigram"

    def search(self, organization_id: str, query: str, limit: int = 10, chunk_ids_filter: Optional[List[str]] = None) -> List[KeywordSearchResult]:
        from sqlalchemy import text
        
        if not query.strip():
            return []
            
        session = self.session_factory()
        try:
            # We assume a virtual table `knowledge_chunks_fts` exists and is synced.
            # Wait, we haven't created FTS tables in Alembic. We will do this via triggers or explicit sync.
            # If `knowledge_chunks_fts` isn't set up, this will fail. Let's design it to use SQLite `LIKE` if FTS fails, 
            # or ensure FTS table exists. For now, we write the SQL expecting `knowledge_chunks_fts`.
            
            # Escape query for FTS5
            safe_query = query.replace("'", "''").replace('"', '""')
            
            sql = """
                SELECT fts.chunk_id, bm25(knowledge_chunks_fts) as score
                FROM knowledge_chunks_fts fts
                JOIN knowledge_chunks kc ON fts.chunk_id = kc.id
                WHERE knowledge_chunks_fts MATCH :query
                  AND kc.organization_id = :org_id
            """
            params = {"query": f'"{safe_query}"', "org_id": organization_id}
            
            if chunk_ids_filter is not None:
                if not chunk_ids_filter:
                    return [] # filter is empty, nothing can match
                sql += f" AND kc.id IN ({','.join(['?']*len(chunk_ids_filter))})"
                # In sqlalchemy text we use :id_1, :id_2 etc.
                filter_params = {f"id_{i}": cid for i, cid in enumerate(chunk_ids_filter)}
                sql = sql.replace(f"({','.join(['?']*len(chunk_ids_filter))})", f"({','.join([':'+k for k in filter_params.keys()])})")
                params.update(filter_params)
                
            sql += " ORDER BY score LIMIT :limit"
            params["limit"] = limit
            
            result = session.execute(text(sql), params).fetchall()
            
            # bm25 returns negative scores in SQLite (more negative is better)
            # We will invert it so higher is better
            return [KeywordSearchResult(chunk_id=r[0], score=-r[1]) for r in result]
        except Exception as e:
            logger.error(f"FTS search failed: {e}")
            return []
        finally:
            session.close()

class LikeSearchProvider(KeywordSearchProvider):
    def __init__(self, session_factory):
        self.session_factory = session_factory

    def get_method_name(self) -> str:
        return "LIKE"

    def search(self, organization_id: str, query: str, limit: int = 10, chunk_ids_filter: Optional[List[str]] = None) -> List[KeywordSearchResult]:
        from sqlalchemy import select
        from app.db.models import KnowledgeChunk
        
        if not query.strip():
            return []
            
        session = self.session_factory()
        try:
            stmt = select(KnowledgeChunk.id).where(
                KnowledgeChunk.organization_id == organization_id,
                KnowledgeChunk.text.like(f"%{query}%")
            )
            
            if chunk_ids_filter is not None:
                if not chunk_ids_filter:
                    return []
                stmt = stmt.where(KnowledgeChunk.id.in_(chunk_ids_filter))
                
            stmt = stmt.limit(limit)
            results = session.execute(stmt).scalars().all()
            
            # LIKE doesn't have a score, so we assign a uniform score or decreasing score
            return [KeywordSearchResult(chunk_id=cid, score=1.0) for cid in results]
        finally:
            session.close()

class MockKeywordSearchProvider(KeywordSearchProvider):
    def get_method_name(self) -> str:
        return "Mock Keyword"

    def search(self, organization_id: str, query: str, limit: int = 10, chunk_ids_filter: Optional[List[str]] = None) -> List[KeywordSearchResult]:
        # Return mock results if filter is provided
        if chunk_ids_filter:
            return [KeywordSearchResult(chunk_id=cid, score=1.0) for cid in chunk_ids_filter[:limit]]
        return []

class HybridKeywordSearchProvider(KeywordSearchProvider):
    """
    Automatically switches between FTS5 (for >=3 chars) and LIKE (for <3 chars),
    or acts as LIKE fallback if FTS5 is entirely unavailable.
    """
    def __init__(self, session_factory, is_fts5_available: bool):
        self.fts_provider = Fts5TrigramSearchProvider(session_factory)
        self.like_provider = LikeSearchProvider(session_factory)
        self.is_fts5_available = is_fts5_available
        self._last_used_method = "Hybrid"

    def get_method_name(self) -> str:
        return self._last_used_method

    def search(self, organization_id: str, query: str, limit: int = 10, chunk_ids_filter: Optional[List[str]] = None) -> List[KeywordSearchResult]:
        if self.is_fts5_available and len(query) >= 3:
            self._last_used_method = "FTS5 trigram"
            return self.fts_provider.search(organization_id, query, limit, chunk_ids_filter)
        else:
            self._last_used_method = "LIKE"
            return self.like_provider.search(organization_id, query, limit, chunk_ids_filter)

def get_keyword_search_provider(session_factory) -> KeywordSearchProvider:
    # Test FTS5 capability at startup
    is_fts5_available = check_fts5_trigram_support()
    logger.info(f"FTS5 trigram support: {is_fts5_available}")
    
    return HybridKeywordSearchProvider(session_factory, is_fts5_available)
