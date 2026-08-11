import os
import sys
import asyncio
import logging
from typing import List

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.llm.provider import LLMProviderFactory
from app.core.knowledge.card_extractor import KnowledgeCardExtractor
from app.db.models import KnowledgeCard

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)
# Suppress httpx logs
logging.getLogger("httpx").setLevel(logging.WARNING)

async def main():
    # 実際にはPDF等から抽出したテキストをループして渡すが、今回はインジェスト基盤のテスト用テキストを使用
    sample_text = """
    資料作成の基本として「3色ルール」があります。
    多くの色を使いすぎると、読み手はどこが重要かわからなくなり、視線が散漫になります。
    そのため、基本となるメインカラー、背景等のベースカラー、そして強調したい箇所にのみ使うアクセントカラーの3色に絞ることが重要です。
    悪い例：1つのスライドに赤、青、緑、黄色が意味なく混在している状態。
    良い例：全体をネイビーとグレーで統一し、最も伝えたい数字だけをオレンジで強調する。
    ただし、IR資料など企業の指定フォーマットがある場合は例外となります。
    """
    
    source_title = "Text 2: 情報整理・配色・レイアウト"
    organization_id = "default_org" # 実際のシステムでは既存の組織IDを使用する
    
    # 強制的にモックプロバイダーでテストする
    os.environ["LLM_PROVIDER"] = "mock"
    
    logger.info("Initializing LLM Provider...")
    # 環境変数にLLM_PROVIDERが設定されている前提 (mock, ollama, azure_openai)
    llm_provider = LLMProviderFactory.create()
    
    extractor = KnowledgeCardExtractor(llm_provider=llm_provider)
    
    logger.info(f"Extracting Knowledge Cards using provider: {llm_provider.__class__.__name__} ...")
    try:
        cards_data = await extractor.extract_cards(
            text_content=sample_text,
            source_document_title=source_title,
            organization_id=organization_id,
            source_chunk_ids=["sample-chunk-id-123"]
        )
        
        logger.info(f"Extracted {len(cards_data)} cards.")
        
        # DBへの保存
        engine = create_engine("sqlite:///knowledge.db")
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        try:
            for c_data in cards_data:
                logger.info(f"Card: [{c_data['category']}] {c_data['rule_name']}")
                logger.info(f"  Principle: {c_data['principle']}")
                if c_data['problem_pattern']:
                    logger.info(f"  Problem: {c_data['problem_pattern']}")
                if c_data['recommended_action']:
                    logger.info(f"  Action: {c_data['recommended_action']}")
                    
                # DBモデルへ変換して保存
                db_card = KnowledgeCard(**c_data)
                db.add(db_card)
            
            db.commit()
            logger.info("Saved to database successfully.")
        except Exception as db_e:
            db.rollback()
            logger.error(f"Database error: {db_e}")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Extraction failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
