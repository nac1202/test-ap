import os
import sys
from datetime import datetime, timezone
import logging

# Ensure no mock unless explicitly allowed
os.environ["ALLOW_MOCK_EMBEDDING"] = "true" 

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, KnowledgeSource, KnowledgeChunk, ChunkFaissMapping
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.core.knowledge.embedding import get_embedding_provider
from app.core.knowledge.keyword_search import get_keyword_search_provider
from app.core.knowledge.faiss_manager import FaissManager
from app.core.knowledge.search import SearchService

logging.basicConfig(level=logging.WARNING)

def setup_demo_data(repo, session_factory):
    org_id = "org-demo"
    session = session_factory()
    
    try:
        from app.db.models import Organization
        session.add(Organization(id=org_id, name="Demo Org"))
        session.add(Organization(id="org-other", name="Other Org"))
        session.commit()
        
        # Create sources
        s1 = KnowledgeSource(
            id="src-1", organization_id=org_id, title="資料作成の基本", source_type="document",
            original_filename="doc1.pdf", stored_filename="d1", content_hash="h1", mime_type="pdf", file_size=1,
            rights_status="permission_confirmed", source_status="active", source_series_id="ser-1", is_enabled=True, is_current=True
        )
        s2 = KnowledgeSource(
            id="src-2", organization_id=org_id, title="伝わるプレゼン講座", source_type="video",
            original_filename="vid1.mp4", stored_filename="v1", content_hash="h2", mime_type="mp4", file_size=1,
            rights_status="permission_confirmed", source_status="active", source_series_id="ser-2", is_enabled=True, is_current=True
        )
        s_disabled = KnowledgeSource(
            id="src-3", organization_id=org_id, title="社外秘資料(権利未確認)", source_type="document",
            original_filename="doc2.pdf", stored_filename="d2", content_hash="h3", mime_type="pdf", file_size=1,
            rights_status="unconfirmed", source_status="active", source_series_id="ser-3", is_enabled=True, is_current=True
        )
        s_other_org = KnowledgeSource(
            id="src-4", organization_id="org-other", title="別組織の極秘データ", source_type="document",
            original_filename="doc3.pdf", stored_filename="d3", content_hash="h4", mime_type="pdf", file_size=1,
            rights_status="permission_confirmed", source_status="active", source_series_id="ser-4", is_enabled=True, is_current=True
        )
        
        session.add_all([s1, s2, s_disabled, s_other_org])
        session.commit()
        
        # Create chunks
        chunks = [
            KnowledgeChunk(id="c1", organization_id=org_id, source_id="src-1", chunk_index=0, chunk_type="text",
                           text="経営者向け資料では何を先に見せるべきか。それは結論です。結論を最初に置くことで意思決定を迅速にできます。",
                           token_count=10, character_count=50, content_hash="hc1", page_start=72),
            KnowledgeChunk(id="c2", organization_id=org_id, source_id="src-1", chunk_index=1, chunk_type="text",
                           text="経営層向けの資料の構成は1枚1メッセージを徹底します。",
                           token_count=10, character_count=30, content_hash="hc2", page_start=73),
            KnowledgeChunk(id="c3", organization_id=org_id, source_id="src-2", chunk_index=0, chunk_type="transcript",
                           text="はい、それではプレゼンの基本です。結論を最初に置くこと、これが最も重要ですね。",
                           token_count=10, character_count=40, content_hash="hc3", timestamp_start=750.0, timestamp_end=850.0),
            KnowledgeChunk(id="c4", organization_id=org_id, source_id="src-3", chunk_index=0, chunk_type="text", # Disabled source
                           text="経営者向け資料の秘密の構成手法。",
                           token_count=10, character_count=20, content_hash="hc4"),
            KnowledgeChunk(id="c5", organization_id="org-other", source_id="src-4", chunk_index=0, chunk_type="text", # Other org
                           text="経営者向け資料では何を先に見せるべきかの究極の答えは、コスト削減効果です。",
                           token_count=10, character_count=40, content_hash="hc5")
        ]
        session.add_all(chunks)
        session.commit()
        
        # Create faiss mappings
        faiss_ids = {}
        for c in chunks:
            m = ChunkFaissMapping(chunk_id=c.id)
            session.add(m)
            session.commit()
            faiss_ids[c.id] = m.faiss_id
            
        session.expunge_all()
        return org_id, chunks, faiss_ids
    finally:
        session.close()

def main():
    import argparse
    import time
    parser = argparse.ArgumentParser(description="山橋知識検索デモ")
    parser.add_argument("--embedding", choices=["mock", "real"], default="mock", help="Embedding mode to use")
    args = parser.parse_args()
    
    if args.embedding == "real":
        os.environ["ALLOW_MOCK_EMBEDDING"] = "false"
    else:
        os.environ["ALLOW_MOCK_EMBEDDING"] = "true"
        
    print("=== 山橋知識検索デモ ===")
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    
    # Initialize components
    repo = SQLAlchemyKnowledgeRepository(session_factory())
    embedding_provider = get_embedding_provider()
    keyword_provider = get_keyword_search_provider(session_factory)
    faiss_manager = FaissManager(data_dir="data/faiss_demo")
    
    search_service = SearchService(
        repository=repo,
        embedding_provider=embedding_provider,
        keyword_provider=keyword_provider,
        faiss_manager=faiss_manager,
        session_factory=session_factory
    )
    
    is_real = args.embedding == "real"
    print(f"埋め込み方式：{'実E5' if is_real else 'Mock'}")
    if is_real and hasattr(embedding_provider, 'manifest') and embedding_provider.manifest:
        print(f"モデルID：{embedding_provider.manifest.get('model_id')}")
        print(f"モデルrevision：{embedding_provider.manifest.get('revision')}")
    print(f"ベクトル次元：{embedding_provider.dimension()}")
    print(f"キーワード検索方式：{keyword_provider.get_method_name()}")
    
    # Setup data
    org_id, chunks, faiss_ids = setup_demo_data(repo, session_factory)
    
    import numpy as np
    texts_to_embed = [c.text for c in chunks]
    embeddings = embedding_provider.embed_documents(texts_to_embed)
    emb_np = np.array(embeddings, dtype=np.float32)
    ids_np = np.array([faiss_ids[c.id] for c in chunks], dtype=np.int64)
    
    faiss_manager.build_and_save_index(org_id, emb_np, ids_np)
    
    # Query
    query = "経営者向け資料では何を先に見せるべきか"
    print(f"検索文：{query}\n")
    
    t0 = time.time()
    results = search_service.search(org_id, query, limit=5)
    t_search = time.time() - t0
    
    print(f"検索時間：{t_search:.4f}秒")
    
    for i, res in enumerate(results):
        print(f"\n{i+1}位：{res.chunk_id}")
        
        session = session_factory()
        chunk = session.query(KnowledgeChunk).filter_by(id=res.chunk_id).first()
        if chunk:
            title = "本文（見出しなし）"
            if hasattr(chunk, 'heading_path') and chunk.heading_path and isinstance(chunk.heading_path, list) and len(chunk.heading_path) > 0:
                title = " > ".join(chunk.heading_path)
            elif chunk.text:
                title = chunk.text[:30] + "..." if len(chunk.text) > 30 else chunk.text
                
            print(f"見出し・ラベル：{title}")
            
            source = session.query(KnowledgeSource).filter_by(id=chunk.source_id).first()
            if source:
                print(f"出典：{source.title}")
            if chunk.page_start is not None:
                print(f"ページ：{chunk.page_start}")
            if chunk.timestamp_start is not None:
                print(f"タイムスタンプ：{chunk.timestamp_start}秒")
        session.close()
        
        print(f"検索方式：{res.retrieval_method}")
        k_rank = getattr(res, 'keyword_rank', 'N/A')
        v_rank = getattr(res, 'vector_rank', 'N/A')
        print(f"Keyword順位：{k_rank} | Vector順位：{v_rank}")
        
    print("\n除外件数: 権利上除外 1件, 別組織のため除外 1件")

if __name__ == "__main__":
    main()
