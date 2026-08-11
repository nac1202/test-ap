import os
import sys
import argparse
import asyncio

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.knowledge.search import SearchService, SearchResultItem
from app.core.llm.provider import LLMProviderFactory
from app.core.rag.evidence_gate import EvidenceGate
from app.core.rag.service import RAGService, RAGRequest

# Mock session factory
class MockSession:
    def add(self, *args, **kwargs):
        pass
    def commit(self):
        pass

def mock_session_factory():
    return MockSession()

# Mock SearchService
class MockSearchService(SearchService):
    def __init__(self):
        pass
        
    def search(self, organization_id, query, limit=5, rrf_k=60):
        if "ラーメン" in query:
            # Irrelevant query
            return [
                SearchResultItem(
                    chunk_id="chunk-ramen-1",
                    source_id="source-ramen-1",
                    source_title="ラーメンの作り方",
                    keyword_rank=None,
                    vector_rank=None,
                    vector_score=0.001,
                    rrf_score=0.001,
                    retrieval_method="Mock",
                    author=None,
                    chapter=None,
                    section=None,
                    page_start=None,
                    page_end=None,
                    video_title=None,
                    timestamp_start=None,
                    timestamp_end=None,
                    source_version=1,
                    snippet="美味しいラーメンの作り方について。"
                )
            ]
        elif "経営者向け資料" in query:
            # Relevant query
            return [
                SearchResultItem(
                    chunk_id="chunk-business-1",
                    source_id="source-business-1",
                    source_title="資料作成の基本",
                    chapter="第3章",
                    section="エグゼクティブサマリー",
                    page_start=72,
                    page_end=72,
                    keyword_rank=1,
                    vector_rank=1,
                    vector_score=0.95,
                    rrf_score=0.03,
                    retrieval_method="Mock",
                    author="山橋美穂",
                    video_title=None,
                    timestamp_start=None,
                    timestamp_end=None,
                    source_version=1,
                    snippet="経営者向け資料では、最初に結論と判断に必要な要点を提示することが重要です。"
                )
            ]
        else:
            return []

async def main(model_id: str, provider: str):
    print("=== 山橋知識RAGデモ ===")
    print(f"LLM: {model_id} (Provider: {provider})")
    print("検索方式: Mock Search")
    
    search_service = MockSearchService()
    
    os.environ["LLM_PROVIDER"] = provider
    llm_provider = LLMProviderFactory.create()
        
    evidence_gate = EvidenceGate()
    
    rag_service = RAGService(
        search_service=search_service,
        llm_provider=llm_provider,
        evidence_gate=evidence_gate,
        session_factory=mock_session_factory
    )
    
    queries = [
        "経営者向け資料では、最初に何を提示すればよいですか？",
        "美味しいラーメンの作り方について教えてください。",
    ]
    
    for query in queries:
        print(f"\n質問：\n{query}\n")
        req = RAGRequest(
            organization_id="org-demo-1",
            user_id="user-demo-1",
            query=query,
            model_id=model_id
        )
        
        resp = await rag_service.generate_answer(req)
        
        print("回答：")
        print(resp.answer)
        print()
        print("根拠：")
        if not resp.citations:
            print("（なし）")
        else:
            for idx, cit in enumerate(resp.citations):
                print(f"[{idx+1}] Chunk: {cit.chunk_id} (Source: {cit.source_id})")
        
        print(f"\n回答状態：{resp.answer_status}")
        print(f"信頼度：{resp.confidence}")
        print("-" * 40)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAG Demo Script")
    parser.add_argument("--model", type=str, default="mock-model-1", help="Model ID (use 'mock-model-1' for mock)")
    parser.add_argument("--provider", type=str, default="mock", help="Provider (mock, ollama, azure_openai)")
    args = parser.parse_args()
    
    asyncio.run(main(args.model, args.provider))
