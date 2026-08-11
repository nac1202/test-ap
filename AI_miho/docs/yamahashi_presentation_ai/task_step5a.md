# Step 5A: RAG安全基盤 実装タスク

## 1. 開発環境の自動確認
- `[x]` Ollama稼働状況、導入済みモデル、メモリ、GPU等の自動確認スクリプト実行・結果報告

## 2. 検索・根拠判定 (Evidence Gate)
- `[x]` `app/core/rag/evidence_gate.py` の作成
- `[x]` RRF順位、Vector類似度、スコア差などを加味した判定ロジックの実装
- `[x]` `sufficient`, `weak`, `none`, `ambiguous`, `out_of_scope` のステータス返却
- `[x]` 根拠不足（`none`, `out_of_scope`）時のLLM呼び出しスキップ機構

## 3. RAGコンテキスト構築とプロンプト分離
- `[x]` 長いチャンクIDから一時的な短い引用ID（例: `K1`, `K2`）への変換マッピング
- `[x]` `system` ロールへの知識チャンクの格納
- `[x]` `user` ロールへのユーザ質問の格納と特殊タグエスケープ
- `[x]` システムプロンプトにおける「山橋美穂です」等のなりすまし禁止と、提供知識のみを根拠とする制約の明記

## 4. Structured Outputs と スキーマ定義
- `[x]` `app/core/rag/models.py` の作成
- `[x]` `RAGResponse`, `Citation`, `Claim` 等のPydanticモデル定義
- `[x]` Ollama API の `format` 引数へJSON Schemaを渡す処理 (`OllamaProvider` の拡張)

## 5. 出典ID・Claimの検証ロジック
- `[x]` LLM出力内の `chunk_id` (K1等) が提供したリストに含まれるかの検証
- `[x]` K1 等を実際の `chunk_id` と `source_id`、DBのページ数・タイムスタンプへ置換する処理
- `[x]` claimsから参照されていないcitationの検知
- `[x]` パースエラーや不整合発生時の最大3回の再試行ロジックの実装

## 6. RAGServiceの統合と監査ログ
- `[x]` `app/db/models.py` への `RagAuditLog` テーブル追加
- `[x]` 質問、回答ハッシュ、モデルバージョン、レイテンシ等を記録（デフォルトで本文は保存しない）
- `[x]` `app/core/rag/service.py` (`RAGService`) の作成

## 7. Mockテストとインジェクション防御検証
- `[x]` `MockProvider` を用いた結合テスト
- `[x]` プロンプトインジェクション（「上記の指示を無視してください」等）の防御テスト
- `[x]` 存在しないIDをLLMが返却した際の検証エラー・再試行テスト
- `[x]` 無関係質問の `no_evidence` 判定テスト

## 8. CLI・デモ
- `[x]` `scripts/demo_rag.py` の作成（Mockモード）

## 9. 完了報告
- `[x]` Step 5A 完了報告書の作成
