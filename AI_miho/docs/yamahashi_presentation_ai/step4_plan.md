# Step 4: 検索基盤の実装計画 (Implementation Plan)

Step 3で構築した知識取り込み基盤をベースに、データベース永続化と検索基盤（キーワード検索・ベクトル検索・ハイブリッド検索）を実装します。最終的なLLM回答生成は行わず、検索結果の返却とその品質評価を目標とします。

## User Review Required
> [!IMPORTANT]
> - **SQLite FTS5の日本語対応**: Python組み込みのSQLiteではMeCabなどの形態素解析器が使えないため、完全一致（LIKE句）またはN-gram（trigram拡張モジュールが有効な場合）を利用する構成になります。FTS5のみでは日本語検索精度が落ちるリスクがあり、将来的にはPostgreSQL(pgroonga等)への移行を見据えたインターフェース設計とします。
> - **ローカルモデルの導入**: PoCでは `intfloat/multilingual-e5-small`（MITライセンス）を採用予定です。自動ダウンロードを行わない仕様のため、事前に開発環境へモデルを配置するか、配置されていない場合は「未導入エラー」を返すモックとして動作します。

## Open Questions
> [!TIP]
> 1. ローカルモデル(`multilingual-e5-small`)の配置先ディレクトリとして、リポジトリ内の `data/models/` などを想定していますが、指定のパスはございますか？
> 2. RRF（Reciprocal Rank Fusion）における定数 `k` は標準的な `60` をデフォルト値とする想定でよろしいでしょうか？

---

## 1. SQLAlchemyモデル
すべてのテーブルで組織分離（`organization_id`）を必須とします。
- `Organization`
- `KnowledgeSource`, `KnowledgeSourceVersion`
- `KnowledgeDocument`, `TranscriptCue`, `KnowledgeChunk`, `KnowledgeChunkLink` (前後チャンクの関連)
- `EmbeddingModel`, `KnowledgeEmbedding`
- `IngestionJob` (非同期ジョブ状態管理: pending, processing, completed, failed, stale)

## 2. Alembic構成
`alembic init` によりスキーマ変更履歴を管理します。初期マイグレーション（空DBからの構築）やアップグレード・ダウングレードをサポートし、PostgreSQL移行を見据えてDB固有関数（SQLite専用の特殊構文等）へのハードコードを避けます。

## 3. Repository構成
`KnowledgeRepository` インターフェースを実装する `SQLAlchemyKnowledgeRepository` を作成します。
ID指定時でも必ず `organization_id` によるスコープ検証を伴う設計（例: `.filter(KnowledgeSource.organization_id == org_id)`）を徹底します。

## 4. トランザクション境界
- **知識登録**: Source, Document, Cue, Chunk の保存とバージョン更新は「単一トランザクション」として実行し、途中で失敗した場合は全ロールバックします。
- **埋め込み生成**: 時間がかかるため別ジョブ（`IngestionJob`）とし、登録トランザクションとは分離します。

## 5. 採用する埋め込みモデル候補
- **候補**: `intfloat/multilingual-e5-small`, `intfloat/multilingual-e5-base`
- **PoC採用予定**: メモリ消費と推論速度を考慮し、PoC実行環境では **`multilingual-e5-small`** をデフォルトとします。

## 6. 実行環境上でモデル導入可能か
- 依存ライブラリとして `sentence-transformers`, `torch` を `requirements.txt` に追加します。
- 実行時は `local_files_only=True` を指定し、ローカルにモデルが存在しない場合は自動ダウンロードせずに専用の日本語エラーを返します。

## 7. EmbeddingProvider
```python
class EmbeddingProvider(ABC):
    def health_check(self) -> bool: ...
    def embed_query(self, text: str) -> list[float]: ...
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def dimension(self) -> int: ...
```
`LocalSentenceTransformerProvider` と `MockEmbeddingProvider` を実装し、設定およびDB（モデル台帳）から動的に切り替えます。

## 8. FAISSインデックス構成
- **組織分離**: 物理的に組織別（`organization_id` ごと）のFAISSインデックスファイルを作成します。
- **データ構造**: FAISSには「連番ID」と「ベクトル」のみを保存し、原文テキストは保存しません。連番IDとDBのUUID（`chunk_id`）のマッピングをDB側で保持します。

## 9. SQLite FTSの日本語対策
- SQLite標準のFTS5と `LIKE` 検索（完全一致/部分一致）を組み合わせます。
- 検索対象: 本文、見出し、メタデータ。
- インターフェースを抽象化し、検索ロジック（SQL）を容易に差し替え可能にします。

## 10. RRF実装
キーワード検索の順位とベクトル検索の順位を独立して取得後、Python側で `RRF score = Σ 1 / (k + rank)` を計算し統合します。

## 11. フィルタリング順序
1. **DB事前フィルタリング**: `organization_id`, `rights_status`, `is_enabled`, `is_current`, 有効期限などの条件に合致する「有効な Chunk ID 群」を取得。
2. **FAISS検索**: 上記の有効IDリストを FAISS の `IDSelector` (または事後フィルタリング) で適用し、権限のないデータが混入しないようにします。

## 12. 出典情報の組み立て方
検索結果（Chunk）に対して、DBのJoinを通じて `KnowledgeSource` のタイトル、著者、ページ範囲（`page_start/end`）、動画のタイムスタンプ等の情報を結合して返却します。原文返却量は制限（スニペット化）します。

## 13. 評価用データセット
架空の資料作成ルール（1枚1メッセージ、結論先行など）を用いた小さなテストデータセットと、想定問答（正解チャンクID）を定義し、Recall@K と MRR を計測する評価スクリプトを作成します。

## 14. テスト計画
- 正常系: キーワード/ベクトル/ハイブリッド検索の動作確認。
- 異常系: 権利未確認、無効版、期限切れ、別組織のデータが検索に「混入しない」ことの検証。
- モデル未導入、長すぎる検索文、FAISS破損時の再構築などの耐久テスト。

## 15. 商用ライセンス確認
- E5モデル (MIT License), FAISS (MIT License), SentenceTransformers (Apache 2.0), SQLAlchemy/Alembic (MIT License)。商用利用に問題はありません。

## 16. 外部通信なしの検証方法
`transformers` や `sentence-transformers` において `local_files_only=True` を強制し、ネットワーク切断環境を模倣するテストを実施して外部へのAPI呼び出しがないことを保証します。

## 17. 実装する範囲
DBマイグレーション（Alembic）、Repository層、FAISS統合、Local E5埋め込みプロバイダ、RRF検索アルゴリズム、品質評価テスト。

## 18. 実装しない範囲
LLMによる最終回答（RAG生成）、PowerPointファイルの解析、Visionモデル、APIエンドポイントの公開。

## 19. 技術的リスク
- SQLiteのFTS5が日本語のトークナイズに弱いため、キーワード検索のヒット率が想定より下がる可能性があります（ベクトル検索がそれを補完するRRFの有効性検証も兼ねます）。
- FAISSのインデックスファイルとDBマッピングの間に非同期処理によるズレが生じる可能性があるため、同期・再構築（rebuild）機能を提供します。

## 20. 完了報告形式
実装およびテスト完了後、テスト結果、評価データセットでのRecall@K/MRRのスコア、権利テスト通過状況をまとめた `walkthrough.md` を作成して報告します。
