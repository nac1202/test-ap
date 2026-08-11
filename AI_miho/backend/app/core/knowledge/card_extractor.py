import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime, timezone

from app.core.llm.provider import LLMProvider, LLMError
from app.models.knowledge import RightsStatus

logger = logging.getLogger(__name__)

# LLMに抽出させるためのスキーマ専用Pydanticモデル（DB用モデルとは分離し、抽出精度を上げる）
class LLMExtractedCard(BaseModel):
    category: str = Field(description="分類カテゴリ (例: layout_and_whitespace, color, typography, story_and_structure 等)")
    rule_name: str = Field(description="知識の簡潔な名称 (例: '3色ルール', '余白の法則')")
    principle: str = Field(description="大原則・基本理念")
    problem_pattern: Optional[str] = Field(default=None, description="Before/After等における良くない状態のパターン（問題点）")
    reason: Optional[str] = Field(default=None, description="そのルールが必要な理由、または問題となる理由")
    recommended_action: Optional[str] = Field(default=None, description="推奨される具体的なアクション・改善内容")
    after_state: Optional[str] = Field(default=None, description="診断・改善後の完成状態や期待される効果")
    applicable_document_types: List[str] = Field(default_factory=list, description="適用可能な資料のタイプ (例: '投影資料', '配布資料')")
    exceptions: Optional[str] = Field(default=None, description="例外条件、適用すべきでないケース")
    confidence: float = Field(default=1.0, description="抽出内容の確信度 (0.0〜1.0)")

class KnowledgeCardsResponse(BaseModel):
    cards: List[LLMExtractedCard] = Field(description="抽出されたナレッジカードのリスト")

class KnowledgeCardExtractor:
    """
    LLMを使用して、ドキュメントのテキストからKnowledge Cardを抽出するクラス。
    Before/After などの構造化されたプレゼンノウハウを抜き出す。
    """
    def __init__(self, llm_provider: LLMProvider):
        self.llm = llm_provider
        
    async def extract_cards(
        self, 
        text_content: str, 
        source_document_title: str,
        organization_id: str,
        source_chunk_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        テキストからナレッジカードを抽出し、DBへ保存可能な辞書（またはPydanticモデル）のリストを返す。
        """
        system_prompt = """
あなたは、プレゼン資料作成のプロフェッショナルなノウハウを抽出する専門AIです。
提供されたテキストから、プレゼン作成に関する重要な「知識（ルール、原則、Before/After事例）」を抽出し、ナレッジカードとして構造化してください。

【抽出カテゴリの例 (Taxonomy)】
- purpose_and_audience
- story_and_structure
- information_selection
- layout_and_whitespace
- color
- typography
- visualization
- document_type
- consistency
- presentation_delivery

【抽出のポイント】
- 単なる事実の羅列ではなく、「なぜそうするのか（reason）」「どうすればよくなるのか（recommended_action）」を明確にすること。
- Before / After の事例が含まれている場合は、problem_pattern（悪い例）、reason（なぜダメか）、recommended_action（改善行動）、after_state（改善後の完成状態）として流れを抽出すること。
- 例外（exceptions）や、適用できる資料タイプ（applicable_document_types）があれば記載すること。
- ノウハウが含まれていない一般的な文章からは抽出しないこと。
- 情報が含まれていないフィールドは null または空のリストにして構いません。
"""
        
        user_prompt = f"""
以下のドキュメントテキスト（出典: {source_document_title}）から、ナレッジカードを抽出してください。

【テキスト】
{text_content}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        try:
            # LLMProviderのgenerate_jsonを使って抽出とPydanticバリデーションを同時に行う
            parsed_response = await self.llm.generate_json(
                model_id="gpt-4o",  # 使用するモデルID (Azureの場合はデプロイ名でオーバーライドされる)
                messages=messages,
                response_model=KnowledgeCardsResponse
            )
            
            result_cards = []
            now = datetime.now(timezone.utc)
            
            for extracted in parsed_response.cards:
                card_data = {
                    "id": str(uuid.uuid4()),
                    "organization_id": organization_id,
                    "category": extracted.category,
                    "rule_name": extracted.rule_name,
                    "principle": extracted.principle,
                    "problem_pattern": extracted.problem_pattern,
                    "reason": extracted.reason,
                    "recommended_action": extracted.recommended_action,
                    "after_state": extracted.after_state,
                    "applicable_document_types": extracted.applicable_document_types,
                    "exceptions": extracted.exceptions,
                    "source_document": source_document_title,
                    "source_page": None,  # TODO: 将来的にPDFパーサーからページ番号を渡せるようにする
                    "source_chunk_ids": source_chunk_ids or [],
                    "source_visual_refs": [], # 初期投入時は空
                    "source_type": "yamahashi_direct", # とりあえずデフォルトとして指定
                    "source_priority": 2, # 教材からの抽出としてPriority 2を設定
                    "confidence": extracted.confidence,
                    "rights_status": RightsStatus.UNCONFIRMED.value,
                    "revision_date": now,
                    "created_at": now,
                    "updated_at": now,
                }
                result_cards.append(card_data)
                
            return result_cards
            
        except Exception as e:
            logger.error(f"Error extracting knowledge cards: {e}")
            raise
