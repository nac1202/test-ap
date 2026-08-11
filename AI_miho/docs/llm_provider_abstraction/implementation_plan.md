# Step 5C: LLM Provider抽象化とAzure OpenAI対応 実装計画

本計画は、これまでOllamaによるローカルLLMを前提としていたRAG回答生成機能を改修し、「RAGの検索・データ管理はローカルに保持したまま、LLM推論部分のみを交換可能にするハイブリッド構成」への移行を行うものです。

## Goal
RAG固有の共通処理（検索、権限管理、citation検証、JSONパース等）とLLMへの問い合わせ処理（Provider）を明確に分離します。既存の `OllamaProvider` を維持しつつ、企業標準構成を想定した `AzureOpenAIProvider` を追加します。

---

## 1. アーキテクチャの変更

### 1.1 Provider層の明確な分離
現在 `app/core/llm/provider.py` にある抽象クラス `LLMProvider` を拡充・整理し、Ollama固有の仕様に依存しない共通インターフェースを確立します。
上位の `RAGService` はProviderの実装詳細（通信方法やJSONフォーマット指定方法）を一切意識せず、Pydanticモデルの入出力のみを扱います。

### 1.2 Providerの選択機構（Factoryの導入）
環境変数 `LLM_PROVIDER` （例: `ollama`, `azure_openai`）の値に応じて適切な Provider インスタンスを生成する `LLMProviderFactory` または依存性注入（DI）の設定を追加します。これにより、コード変更なしでデプロイ環境ごとにLLMを切り替え可能にします。

---

## 2. 実装するProvider

### A. OllamaProvider (既存改修)
* **用途**: 高機密環境、完全オフライン環境（PRIVATE構成）向け。
* **対応**: 既存の実装を維持しつつ、新しい共通インターフェース仕様に合わせます。

### B. AzureOpenAIProvider (新規作成)
* **用途**: 高性能LLMを必要とする企業（STANDARD構成）向け。
* **実装**: `openai` ライブラリ（`AsyncAzureOpenAI`）を利用し、Structured Outputs機能（または JSON Mode）による厳格なJSON出力強制を実装します。
* **セキュリティ**: 認証情報（APIキー、エンドポイント等）は `.env` などの環境変数から取得し、コードにはハードコードしません。
* ※ 実APIキー接続を行わないため、まずはモックテストと実装コードの作成にとどめます。

---

## 3. セキュリティとログ・データ管理

### 3.1 データのローカル保持
Embedding（実E5モデル）およびFAISS/FTS5インデックスは引き続きローカル実行を維持します。クラウド（Azure OpenAI）に送信されるのは、「ユーザーの質問」と「RAGによって絞り込まれた最小限のチャンク」のみとし、元文書全体は送信しません。

### 3.2 送信内容の透明性（デバッグログ）
開発・デバッグモード時（環境変数等で制御）に、実際にクラウド等へ何を送信しているかを明示的に出力するロギングを追加します。
* **出力項目**: 質問、使用チャンクIDリスト、チャンク数、送信文字数、使用Provider、使用モデル
* 機密情報の漏洩を防ぐため、チャンク本文（原文）や応答テキスト全体は本番の標準ログには出力しません。

---

## 4. 既存仕様の維持と影響範囲

### 4.1 Structured Outputs と Pydantic検証
* 出力がJSON形式であり、Pydanticモデルでパース・検証される仕組み（`generate_json` 内のリトライロジック）はそのまま維持します。
* LLMが回答の根拠として用いた citation (chunk_id) が検索結果に存在するかを検証し、不正な citation の場合はエラーとするハルシネーション対策も維持します。

### 4.2 RAGプロンプト
現在の「与えられた情報のみで回答し推測しない」というプロンプト方針は維持しつつ、将来的な「山橋氏の資料診断ルール」等の拡張プロンプトを差し込みやすい構造に整理します。

---

## 5. Step定義の更新

これまでの開発ステップを以下のように再定義します。
* **Step 5B**: LLM Provider抽象化・Ollama移行（今回実施の一部）
* **Step 5C**: クラウドLLM Provider追加（今回実施のメイン）
* **Step 5D**: Provider共通RAGスモークテスト（次回以降）

---

## 6. テスト・検証計画

既存のテスト（RAG検索、FTS5、FAISS、権限フィルタ、citation検証等）を壊さないことを前提とします。
* **共通テストの確認**: `pytest tests/test_rag_service.py` などがパスすること。
* **モックテストの追加**: `AzureOpenAIProvider` のモックを利用し、Azure向けAPI呼び出し形式が正しく構築されるかを検証するテストを追加します。
* **デモの更新**: `scripts/demo_rag.py` を更新し、`--provider` 引数または環境変数で `ollama` と `azure_openai` （モック状態）を切り替えて動作確認できるようにします。

---

## 7. ドキュメント更新
作業完了後、以下のドキュメントを更新します。
* `README.md` に STANDARD構成（クラウドLLM）と PRIVATE構成（ローカルLLM）の違いを追記。
* `.env.example` にAzure OpenAI用の設定項目を追加。
* その他、アーキテクチャや Implementation Plan の整合性を保つための更新。
