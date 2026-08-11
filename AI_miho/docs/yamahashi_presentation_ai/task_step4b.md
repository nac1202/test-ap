# Step 4B: 検索基盤のタスクリスト

## 1. 埋め込みモデル・プロバイダー
- `[x]` `EmbeddingProvider` インターフェースの作成
- `[x]` `LocalSentenceTransformerProvider` の実装（ローカルモデル専用、`query:` `passage:` 接頭辞のテスト）
- `[x]` `MockEmbeddingProvider` の実装
- `[x]` `EMBEDDING_MODEL_ROOT` 環境変数と `ALLOW_MOCK_EMBEDDING` の判定ロジック

## 2. キーワード検索プロバイダー
- `[x]` SQLite環境の FTS5 / trigram 実行可否判定スクリプト
- `[x]` `KeywordSearchProvider` インターフェースの作成
- `[x]` `Fts5TrigramSearchProvider` の実装
- `[x]` `LikeSearchProvider` の実装
- `[x]` 3文字未満のハイブリッドスイッチ制御

## 3. FAISSインデックス基盤
- `[x]` FAISS 用のID管理（ChunkのUUIDとFAISS用のInteger IDの相互変換マッピング）
- `[x]` `IndexFlatIP + IndexIDMap2` 構築とL2正規化による類似度計算
- `[x]` 一時ファイル出力・チェックサム計算・アトミック置換機能
- `[x]` `organization_id` ごとの物理インデックス分割

## 4. 検索フィルタリングと二重検証
- `[x]` 検索前フィルタ：DBから有効なチャンクID群を抽出するクエリ
- `[x]` FAISSでのIDベースフィルタの適用
- `[x]` 検索後フィルタ：DBからのメタデータ取得時の権限・状態再検証

## 5. RRF・ハイブリッド検索
- `[x]` RRF（k=60初期値）計算関数の実装
- `[x]` ベクトル検索結果とキーワード検索結果の統合
- `[x]` スニペット制限と出力情報フォーマットの整形

## 6. 品質評価と確認用CLI
- `[x]` 架空の「資料作成ルール」を用いた品質評価用データセットとスクリプト作成
- `[x]` 外部通信遮断の検証テスト
- `[x]` `scripts/demo_search.py` の実装
- `[x]` Step 4B 完了報告書の作成（walkthrough.md 更新）
