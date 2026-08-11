import os
import sys
import time
import json
from datetime import datetime, timezone
import psutil

# Do not force mock here. Let the environment decide, or default to checking it.
# os.environ["ALLOW_MOCK_EMBEDDING"] = "true"

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, KnowledgeSource, KnowledgeChunk, ChunkFaissMapping
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.core.knowledge.embedding import get_embedding_provider
from app.core.knowledge.keyword_search import get_keyword_search_provider
from app.core.knowledge.faiss_manager import FaissManager
from app.core.knowledge.search import SearchService

def setup_evaluation_data(repo, session_factory):
    org_id = "org-eval"
    session = session_factory()
    try:
        from app.db.models import Organization
        session.add(Organization(id=org_id, name="Eval Org"))
        session.add(Organization(id="org-other", name="Other Org"))
        session.commit()
        
        # Create sources
        s1 = KnowledgeSource(
            id="src-eval-1", organization_id=org_id, title="資料作成の基本ルール", source_type="doc",
            original_filename="a", stored_filename="a", content_hash="h1", mime_type="pdf", file_size=1,
            rights_status="permission_confirmed", source_status="active", source_series_id="ser-eval-1", is_enabled=True, is_current=True
        )
        s_disabled = KnowledgeSource(
            id="src-eval-2", organization_id=org_id, title="古いルール", source_type="doc",
            original_filename="b", stored_filename="b", content_hash="h2", mime_type="pdf", file_size=1,
            rights_status="unconfirmed", source_status="active", source_series_id="ser-eval-2", is_enabled=True, is_current=False
        )
        s_other_org = KnowledgeSource(
            id="src-eval-3", organization_id="org-other", title="他組織のルール", source_type="doc",
            original_filename="c", stored_filename="c", content_hash="h3", mime_type="pdf", file_size=1,
            rights_status="permission_confirmed", source_status="active", source_series_id="ser-eval-3", is_enabled=True, is_current=True
        )
        session.add_all([s1, s_disabled, s_other_org])
        session.commit()
        
        chunks = [
            KnowledgeChunk(id="chunk_eval_1", organization_id=org_id, source_id="src-eval-1", chunk_index=0, chunk_type="text",
                           text="プレゼン資料では、1枚1メッセージを基本とし、最も重要な結論を一番最初に配置してください。これにより理解が早まります。",
                           token_count=10, character_count=50, content_hash="hc1"),
            KnowledgeChunk(id="chunk_eval_2", organization_id=org_id, source_id="src-eval-1", chunk_index=1, chunk_type="text",
                           text="フォントサイズは最低24pt以上を使用し、強調したい箇所以外は黒または濃いグレーを基本色としてください。",
                           token_count=10, character_count=50, content_hash="hc2"),
            KnowledgeChunk(id="chunk_eval_3", organization_id=org_id, source_id="src-eval-1", chunk_index=2, chunk_type="text",
                           text="グラフは3Dを避け、シンプルな2Dの棒グラフや折れ線グラフを使用します。凡例はグラフ内に直接記載します。表ではなくグラフを使うべきなのは、直感的な推移や比較を示したい場合です。",
                           token_count=10, character_count=50, content_hash="hc3"),
            KnowledgeChunk(id="chunk_eval_4", organization_id=org_id, source_id="src-eval-1", chunk_index=3, chunk_type="text",
                           text="一枚のスライドに情報を詰め込みすぎない方がよい理由は、視認性が下がり、聞き手の集中力が削がれるためです。余白を適切にとりましょう。",
                           token_count=10, character_count=50, content_hash="hc3_2"),
            KnowledgeChunk(id="chunk_eval_5", organization_id=org_id, source_id="src-eval-1", chunk_index=4, chunk_type="text",
                           text="意思決定を早める資料構成にするため、冒頭にサマリーと期待するアクションを記載し、詳細なデータは後半に回してください。経営者に見せる資料では最初にこれらを提示します。",
                           token_count=10, character_count=50, content_hash="hc3_3"),
            KnowledgeChunk(id="chunk_eval_6", organization_id=org_id, source_id="src-eval-1", chunk_index=5, chunk_type="text",
                           text="スライドに色を何種類も使うと、何が重要なのか分からなくなる問題があります。メインカラー、アクセントカラー、ベースカラーの3色に抑えましょう。",
                           token_count=10, character_count=50, content_hash="hc3_4"),

            # Invalid chunks
            KnowledgeChunk(id="chunk_eval_old", organization_id=org_id, source_id="src-eval-2", chunk_index=0, chunk_type="text",
                           text="【旧版】結論は最後に配置し、起承転結を意識してください。",
                           token_count=10, character_count=50, content_hash="hc4"),
            KnowledgeChunk(id="chunk_eval_other", organization_id="org-other", source_id="src-eval-3", chunk_index=0, chunk_type="text",
                           text="他社のグラフはすべて3Dグラフを使用すること。",
                           token_count=10, character_count=50, content_hash="hc5"),
        ]
        session.add_all(chunks)
        session.commit()
        
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

def evaluate():
    print("=== 検索品質評価 (Evaluation) ===")
    
    # Environment info
    print(f"Date: {datetime.now(timezone.utc).isoformat()}")
    print(f"ALLOW_MOCK_EMBEDDING: {os.environ.get('ALLOW_MOCK_EMBEDDING', 'Not Set')}")
    
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    
    repo = SQLAlchemyKnowledgeRepository(session_factory())
    
    t0 = time.time()
    embedding_provider = get_embedding_provider()
    t_load_first = time.time() - t0
    
    # 2nd load time (should be instant)
    t0 = time.time()
    embedding_provider.health_check()
    t_load_second = time.time() - t0
    
    keyword_provider = get_keyword_search_provider(session_factory)
    faiss_manager = FaissManager(data_dir="data/faiss_eval")
    
    search_service = SearchService(
        repository=repo,
        embedding_provider=embedding_provider,
        keyword_provider=keyword_provider,
        faiss_manager=faiss_manager,
        session_factory=session_factory
    )
    
    org_id, chunks, faiss_ids = setup_evaluation_data(repo, session_factory)
    
    import numpy as np
    texts_to_embed = [c.text for c in chunks]
    
    # measure embed passage avg time
    t0 = time.time()
    embeddings = embedding_provider.embed_documents(texts_to_embed)
    t_embed_passages = time.time() - t0
    avg_embed_passage = t_embed_passages / len(texts_to_embed)
    
    faiss_manager.build_and_save_index(org_id, np.array(embeddings, dtype=np.float32), np.array([faiss_ids[c.id] for c in chunks], dtype=np.int64))
    
    # measure query time
    t0 = time.time()
    embedding_provider.embed_query("テストクエリ")
    t_embed_query = time.time() - t0
    
    test_queries = [
        # Keywords
        ("結論", "chunk_eval_1"),
        ("フォントサイズ", "chunk_eval_2"),
        # Natural Language (Required in Step 4C)
        ("経営者に見せる資料では最初に何を提示すればよいですか", "chunk_eval_5"),
        ("スライドに色を何種類も使うと何が問題ですか", "chunk_eval_6"),
        ("表ではなくグラフを使うべきなのはどのような場合ですか", "chunk_eval_3"),
        ("一枚のスライドに情報を詰め込みすぎない方がよい理由は何ですか", "chunk_eval_4"),
        ("意思決定を早める資料構成について教えてください", "chunk_eval_5"),
        # Synonyms / Rephrasing
        ("社長向けのプレゼンでは、冒頭に何を置く？", "chunk_eval_5"),
        # Negative expression
        ("3Dグラフを使ってもいいですか？", "chunk_eval_3"), # It says to avoid
        # Irrelevant question (should ideally return low scores, but we just check what it hits)
        ("美味しいラーメンの作り方", None),
    ]
    
    methods_to_test = [
        {"name": f"{embedding_provider.__class__.__name__} Hybrid RRF", "vector": True, "keyword": True},
        {"name": f"{embedding_provider.__class__.__name__} Vector Only", "vector": True, "keyword": False},
        {"name": "Keyword Only", "vector": False, "keyword": True}
    ]
    
    print("\n--- 環境と計測 ---")
    print(f"使用埋め込みプロバイダ: {embedding_provider.__class__.__name__}")
    print(f"使用キーワードプロバイダ: {keyword_provider.get_method_name()}")
    print(f"出力次元数: {embedding_provider.dimension()}")
    print(f"初回モデルロード時間: {t_load_first:.4f} s")
    print(f"2回目モデルロード時間: {t_load_second:.4f} s")
    print(f"Query 1件の埋め込み時間: {t_embed_query:.4f} s")
    print(f"Passage 平均埋め込み時間 (batch={len(texts_to_embed)}): {avg_embed_passage:.4f} s")
    
    # Memory usage
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    print(f"現在のメモリ使用量: {mem_info.rss / 1024 / 1024:.2f} MB")
    
    for method in methods_to_test:
        print(f"\n--- 評価方式: {method['name']} ---")
        
        # We need to monkey-patch or mock the unused provider to test in isolation
        original_kw_search = search_service.keyword_provider.search
        original_vec_search = search_service.faiss_manager.search
        
        if not method["keyword"]:
            search_service.keyword_provider.search = lambda *args, **kwargs: []
        if not method["vector"]:
            search_service.faiss_manager.search = lambda *args, **kwargs: []
            
        try:
            hits_at_1 = 0
            hits_at_3 = 0
            hits_at_5 = 0
            mrr_sum = 0.0
            
            violations = {"rights": 0, "other_org": 0, "old_version": 0, "irrelevant_hit": 0}
            
            search_times = []
            
            for query, expected_id in test_queries:
                t0 = time.time()
                results = search_service.search(org_id, query, limit=5, rrf_k=60)
                t_search = time.time() - t0
                search_times.append(t_search)
                
                # Check metrics
                rank = None
                for i, res in enumerate(results):
                    if res.chunk_id in ["chunk_eval_old"]:
                        violations["old_version"] += 1
                        violations["rights"] += 1
                    if res.chunk_id in ["chunk_eval_other"]:
                        violations["other_org"] += 1
                        
                    if expected_id is None:
                        # Irrelevant question should ideally have empty results or low scores.
                        # We just count that it hit something.
                        violations["irrelevant_hit"] += 1
                    elif res.chunk_id == expected_id and rank is None:
                        rank = i + 1
                        
                if rank is not None:
                    if rank <= 1: hits_at_1 += 1
                    if rank <= 3: hits_at_3 += 1
                    if rank <= 5: hits_at_5 += 1
                    mrr_sum += 1.0 / rank
                    
            valid_queries_count = len([q for q, exp in test_queries if exp is not None])
            
            print(f"Recall@1: {hits_at_1/valid_queries_count:.2f}")
            print(f"Recall@3: {hits_at_3/valid_queries_count:.2f}")
            print(f"Recall@5: {hits_at_5/valid_queries_count:.2f}")
            print(f"MRR:      {mrr_sum/valid_queries_count:.2f}")
            print(f"平均検索時間: {sum(search_times)/len(search_times):.4f} s")
            print(f"最大検索時間: {max(search_times):.4f} s")
            print(f"権利/旧版/別組織 混入件数: {violations['rights']} / {violations['old_version']} / {violations['other_org']}")
            print(f"無関係質問の誤ヒット件数: {violations['irrelevant_hit']}")
            
        finally:
            # Restore
            search_service.keyword_provider.search = original_kw_search
            search_service.faiss_manager.search = original_vec_search

if __name__ == "__main__":
    evaluate()
