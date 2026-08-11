# Step 4B 修正タスク

## 1. FTS5実テーブルの構築
- `[x]` `knowledge_chunks_fts` (外部コンテンツ方式または通常方式) の定義とトリガー (INSERT/UPDATE/DELETE) 実装
- `[x]` Alembic migration の作成と適用

## 2. キーワード検索の実測とテスト
- `[x]` FTSテーブルへの問い合わせ処理修正 (chunk_id を利用)
- `[x]` 日本語完全一致、部分一致、trigram検索の動作確認

## 3. Keyword評価の再実行
- `[x]` `evaluate_search.py` の再実行と数値取得 (LIKE, FTS5, Vector, Hybrid)

## 4. 決定論的Mock
- `[x]` `MockEmbeddingProvider` で完全に決定論的なハッシュベクトル生成が行われていることの確認とテスト、または固定値化

## 5. フィルタリングテストの追加
- `[x]` 権限切れ、is_enabled=False、削除済みソースなどの事前・事後除外テスト追加

## 6. FAISS安全性テストの補足
- `[x]` 破損インデックスの検出、不整合IDの除外、同時更新ロックのテスト追加

## 7. 自動テストの拡充
- `[x]` ユーザー指示にある Embedding, Keyword, FAISS, Search, RRF の全ケースを網羅したテストケース実装

## 8. demo_search.py の再実行と出力修正
- `[x]` `demo_search.py` の出力形式修正（全文タイトル表示の禁止、メタデータ活用）
- `[x]` 再実行と出力の取得

## 9. 外部通信確認テスト
- `[x]` `unittest.mock` 等を用いて、実行中にHTTP/socket接続試行がないことを検証するテストの追加

## 10. Walkthroughの修正
- `[x]` 実AI精度未評価の正確な表現と実測値での報告書修正
