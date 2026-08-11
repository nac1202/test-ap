import pytest
from unittest.mock import AsyncMock, MagicMock
from app.core.knowledge.card_extractor import KnowledgeCardExtractor, LLMExtractedCard, KnowledgeCardsResponse
from app.models.knowledge import RightsStatus

@pytest.fixture
def mock_llm_provider():
    provider = AsyncMock()
    # Pydanticモデルを返すようにモックする
    dummy_response = KnowledgeCardsResponse(
        cards=[
            LLMExtractedCard(
                category="color",
                rule_name="3色ルール",
                principle="色は3色に絞る",
                problem_pattern="色が多い",
                reason="視線が散漫になる",
                recommended_action="メイン、ベース、アクセントの3色",
                after_state="視線が誘導され内容が伝わりやすくなる",
                applicable_document_types=["投影資料"],
                confidence=0.9
            )
        ]
    )
    provider.generate_json.return_value = dummy_response
    return provider

@pytest.mark.asyncio
async def test_extract_knowledge_cards(mock_llm_provider):
    extractor = KnowledgeCardExtractor(llm_provider=mock_llm_provider)
    
    text = "ダミーテキスト"
    title = "ダミー教材"
    org_id = "test-org"
    
    cards_data = await extractor.extract_cards(
        text_content=text,
        source_document_title=title,
        organization_id=org_id,
        source_chunk_ids=["chunk-1"]
    )
    
    assert len(cards_data) == 1
    card = cards_data[0]
    
    assert card["category"] == "color"
    assert card["rule_name"] == "3色ルール"
    assert card["after_state"] == "視線が誘導され内容が伝わりやすくなる"
    assert card["source_document"] == title
    assert card["source_chunk_ids"] == ["chunk-1"]
    assert card["source_type"] == "yamahashi_direct"
    assert card["source_priority"] == 2
    assert card["organization_id"] == org_id
    assert card["rights_status"] == RightsStatus.UNCONFIRMED.value
