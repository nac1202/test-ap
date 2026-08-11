import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.models import Base, Organization
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, KnowledgeChunk
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository

def main():
    print("=== Step 4A データベース永続化デモ ===")
    
    # In-memory DB for demo
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    repo = SQLAlchemyKnowledgeRepository(session)
    
    org_id = "demo-org-001"
    
    # 1. 組織の登録 (SQLAlchemyKnowledgeRepository creates it automatically on source creation)
    print(f"[*] 組織の登録と初期化: {org_id}")
    
    # 2. 知識ソースの登録
    src = KnowledgeSource(
        id="source-1",
        organization_id=org_id,
        title="資料作成の基本",
        source_type="document",
        original_filename="presentation_basics.pptx",
        stored_filename="uuid.pptx",
        content_hash="hash-1234",
        mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        file_size=10240,
        rights_status="permission_confirmed",
        source_status="active",
        source_series_id="series-1",
        is_enabled=True
    )
    repo.create_source(src)
    print(f"[*] 知識ソースを登録しました：{src.title} (ID: {src.id})")
    
    # 3. チャンクの登録
    c1 = KnowledgeChunk(
        id="c1", organization_id=org_id, source_id="source-1", chunk_index=0,
        text="資料作成は目的の明確化から始まります。", token_count=15, character_count=20, content_hash="hc1"
    )
    c2 = KnowledgeChunk(
        id="c2", organization_id=org_id, source_id="source-1", chunk_index=1,
        text="ターゲット読者を意識しましょう。", token_count=10, character_count=15, content_hash="hc2"
    )
    repo.create_chunks([c1, c2])
    print(f"[*] チャンクを2件登録しました (前後のリンク関係も自動設定)")
    
    # 4. バージョン更新 (新バージョンのアップロードをシミュレート)
    src_v2 = KnowledgeSource(
        id="source-2",
        organization_id=org_id,
        title="資料作成の基本 v2",
        source_type="document",
        original_filename="presentation_basics_v2.pptx",
        stored_filename="uuid2.pptx",
        content_hash="hash-5678",
        mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        file_size=11000,
        rights_status="permission_confirmed",
        source_status="active",
        source_series_id="series-1",
        version=2,
        is_enabled=True
    )
    repo.replace_current_version(org_id, "source-1", src_v2)
    session.commit()
    
    v1_check = repo.get_source(org_id, "source-1")
    v2_check = repo.get_source(org_id, "source-2")
    print(f"[*] バージョン更新実行:")
    print(f"    旧バージョン (v1): 有効={v1_check.is_current}")
    print(f"    新バージョン (v2): 有効={v2_check.is_current}")
    
    # 5. 別組織アクセスのブロック
    org_id_other = "demo-org-002"
    blocked = repo.get_source(org_id_other, "source-2")
    if blocked is None:
        print(f"[*] 別組織からの取得：ブロックされました（組織分離の確認）")
    
    print("=== データベース確認：成功 ===")
    
if __name__ == "__main__":
    main()
