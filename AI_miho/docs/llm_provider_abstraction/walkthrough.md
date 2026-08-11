# Step 5C: LLM Provider抽象化とAzure OpenAI対応 完了報告

AI_miho のLLM推論部分について、「RAG・原本データ・検索インデックス・権限管理はローカルに保持し、LLM推論部分だけを交換可能にするハイブリッド構成」への移行と、Azure OpenAI対応を完了しました。

## 1. 変更したアーキテクチャ
*   従来は `app/core/rag/service.py` （RAGService）において、LLMの呼び出しがOllamaに強く依存していましたが、抽象クラス `LLMProvider` の設計を共通化し、`LLMProviderFactory` を通じて環境変数 `LLM_PROVIDER` から利用するプロバイダを動的に切り替えられるようにしました。
*   利用可能な構成として、以下をサポートするアーキテクチャとなりました。
    *   **STANDARD構成**: ローカルRAG ＋ クラウドLLM (`AzureOpenAIProvider`)
    *   **PRIVATE構成**: ローカルRAG ＋ ローカルLLM (`OllamaProvider`)

## 2. 新規作成・変更した主要ファイル
*   `app/core/llm/provider.py`: 抽象インターフェースの見直しと `LLMProviderFactory` の追加（変更）
*   `app/core/llm/azure_openai.py`: Azure OpenAI に対応するプロバイダクラス（新規）
*   `app/core/rag/service.py`: LLMプロバイダ依存の排除と、デバッグログ（クラウド送信内容の可視化）の追加（変更）
*   `scripts/demo_rag.py`: `--provider` 引数によりモック、Ollama、Azure OpenAI を切り替える機能を追加（変更）
*   `tests/test_azure_openai.py`: AzureOpenAIProviderの動作確認用モックテスト（新規）
*   `backend/.env.example`, `README.md`: 各構成と設定方法の案内（新規/更新）
*   `requirements.txt`: `openai>=1.0.0` の追加（変更）

## 3. Ollama依存だった箇所
*   これまではプロバイダ初期化やPydantic出力フォーマット指定部分において、OllamaのAPI形式（`format: schema`等）に依存する処理が直接利用されがちでしたが、これを `generate_json_raw` の中で各プロバイダがそれぞれの仕様（Azureの場合は `response_format={"type": "json_schema"}`）に吸収する設計にしました。

## 4. Provider化した内容
*   **OllamaProvider**: 既存処理を維持。完全オフライン環境で機能します。
*   **AzureOpenAIProvider**: `AsyncAzureOpenAI` クライアントを用い、Structured Outputs機能による回答生成を実装。
*   **MockProvider**: テストやモック動作用。

## 5. Azure OpenAI対応状況
*   コードレベルでの実装およびモックテストは完了しています。
*   認証情報（APIキー、エンドポイント等）は `.env` などの環境変数から読み込む仕様としており、コード内にハードコードしていません。
*   ※ 実際のAPIキー接続（疎通テスト）は、実キーが利用可能になった後に行う準備が整っています。

## 6. セキュリティ上、クラウドへ送信される情報
クラウドLLM (`AzureOpenAIProvider`) を利用する場合でも、以下の情報**のみ**が送信されます。
*   ユーザーからの入力（質問）
*   システムプロンプト（指示内容）
*   ローカルの検索・権限フィルタを通過した、回答に不可欠な**最小限のチャンク（断片的なテキスト）**のみ

※ `DEBUG_LLM=true` を指定することで、実際に送信されたチャンクの数や文字数、質問内容をログで確認できます。機密となる本文自体は標準ログには出力されません。

## 7. ローカルに残る情報
以下のデータは、クラウドに送信されることなく**すべてローカル環境（オンプレミス）内に保持**されます。
*   山橋氏の著書データ、講座台本、プレゼン資料等の**元文書全体**
*   SQLiteデータベース（権限情報、組織情報、メタデータ）
*   FTS5インデックス（キーワード検索）
*   FAISSインデックス（ベクトル検索）およびEmbeddingの実行処理自体

## 8. テスト結果
*   既存の RAG 検索テスト、権限フィルタ、FTS5/FAISS統合テストなど、計67件の自動テストが引き続きパスすることを確認しました。
*   新たに作成した `test_azure_openai.py` においても、環境変数未設定時のエラーハンドリング、およびモックによるAPIパラメータ（Structured Outputsのスキーマ渡し）の構築が正しく行われることを確認しました。

## 9. 現在のStep
*   今回実施した作業により、**Step 5C (クラウドLLM Provider追加)** までの実装および構造改革が完了しました。

## 10. 次に進むべき推奨Step
次は **Step 5D (Provider共通RAGスモークテスト)** となります。
本番用の実APIキー（Azure OpenAI等）や、ローカルのOllamaデーモンを用いて、実際にLLMが回答を返すかどうかの「実機疎通テスト」に進むことが推奨されます。

---

> [!NOTE]
> **確認事項**
> 本アーキテクチャの変更により、LLMプロバイダを安全かつ柔軟に切り替えられる基盤が完成しました。
> この状態で、実際のクラウドLLM（Azure OpenAI）の実APIキーを用いた接続テスト（スモークテスト）に進んでよろしいでしょうか？
