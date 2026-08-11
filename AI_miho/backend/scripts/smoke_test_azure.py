import os
import sys
import argparse
import asyncio
import logging

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.knowledge.search import SearchService, SearchResultItem
from app.core.llm.provider import LLMProviderFactory
from app.core.rag.evidence_gate import EvidenceGate
from app.core.rag.service import RAGService, RAGRequest

# Setup logging to see payload (for smoke test only)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
# Suppress noisy loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)

class MockSession:
    def add(self, *args, **kwargs): pass
    def commit(self): pass

def mock_session_factory():
    return MockSession()

class DummySearchService(SearchService):
    def __init__(self):
        pass
        
    def search(self, organization_id, query, limit=5, rrf_k=60):
        # Always return dummy chunks, no real data
        return [
            SearchResultItem(
                chunk_id="dummy-chunk-1",
                source_id="dummy-source-1",
                source_title="ダミーテスト文書",
                keyword_rank=1,
                vector_rank=1,
                vector_score=0.99,
                rrf_score=0.03,
                retrieval_method="Dummy",
                author="System",
                chapter=None,
                section=None,
                page_start=1,
                page_end=1,
                video_title=None,
                timestamp_start=None,
                timestamp_end=None,
                source_version=1,
                snippet="AI_mihoは山橋氏のプレゼン作成を支援するシステムです。現在システム連携のダミーテストを実行しています。"
            ),
            SearchResultItem(
                chunk_id="dummy-chunk-2",
                source_id="dummy-source-1",
                source_title="ダミーテスト文書",
                keyword_rank=2,
                vector_rank=2,
                vector_score=0.95,
                rrf_score=0.02,
                retrieval_method="Dummy",
                author="System",
                chapter=None,
                section=None,
                page_start=2,
                page_end=2,
                video_title=None,
                timestamp_start=None,
                timestamp_end=None,
                source_version=1,
                snippet="ダミーチャンク2です。このデータは機密情報を含みません。確認用のデータです。"
            )
        ]

async def main():
    print("=== Azure OpenAI Smoke Test ===")
    
    # 必須環境変数のチェック
    api_key = os.environ.get("AZURE_OPENAI_API_KEY")
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    
    if not api_key or not endpoint:
        print("【エラー】Azure OpenAIの接続情報が設定されていません。")
        print(".envファイルに AZURE_OPENAI_API_KEY と AZURE_OPENAI_ENDPOINT を設定してください。")
        sys.exit(1)
        
    os.environ["LLM_PROVIDER"] = "azure_openai"
    # Ensure payload logging is ON for this test
    os.environ["DEBUG_LLM"] = "true"
    
    llm_provider = LLMProviderFactory.create()
    search_service = DummySearchService()
    evidence_gate = EvidenceGate()
    
    rag_service = RAGService(
        search_service=search_service,
        llm_provider=llm_provider,
        evidence_gate=evidence_gate,
        session_factory=mock_session_factory
    )
    
    test_queries = [
        "AI_mihoとは何ですか？（テスト質問）",
        "存在しない情報（宇宙人の実在など）について教えてください。" # To test EvidenceGate / citation refusal
    ]
    
    for q in test_queries:
        print(f"\n--- Testing Query: {q} ---")
        req = RAGRequest(
            organization_id="dummy-org",
            user_id="dummy-user",
            query=q,
            model_id="gpt-4o" # or whatever is default deployment
        )
        
        try:
            resp = await rag_service.generate_answer(req)
            print("\n[Result]")
            print(f"Answer: {resp.answer}")
            print(f"Status: {resp.answer_status}")
            print(f"Confidence: {resp.confidence}")
            print("Citations:")
            for cit in resp.citations:
                print(f"  - Chunk: {cit.chunk_id}, Source: {cit.source_id}")
                
        except Exception as e:
            print(f"\n[Error occurred] {e}")

if __name__ == "__main__":
    asyncio.run(main())
