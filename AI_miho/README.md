# AI_miho (山橋美穂氏プレゼン用AI)

AI_mihoは、山橋氏の著書やプレゼン資料をベースとした資料作成支援AIです。
RAG (Retrieval-Augmented Generation) アーキテクチャを採用し、セキュリティと正確性を担保した構成となっています。

## 構成パターン

AI_mihoは利用環境の要件に応じて以下の2つの構成をサポートします。

### 1. STANDARD構成 (Cloud LLM)
標準的な企業向け構成です。
- **構成**: ローカルRAG ＋ クラウドLLM (Azure OpenAI)
- **特徴**: 高性能なクラウドAIを利用します。セキュリティを確保するため、クラウドへは「ユーザーの質問」と「回答に必要な最小限のチャンク」のみが送信されます。元文書やインデックスはすべてローカル（オンプレミス）に保持されます。

### 2. PRIVATE / LOCAL構成 (Local LLM)
非常に高い機密性を要求する企業向け構成です。
- **構成**: ローカルRAG ＋ ローカルLLM (Ollama)
- **特徴**: 全ての処理（検索から推論まで）を完全オフラインで完結させます。外部APIへの通信は一切発生しません。

## 環境構築
`backend/.env.example` をコピーして `backend/.env` を作成し、必要な設定（`LLM_PROVIDER` や `AZURE_OPENAI_API_KEY` 等）を記述してください。

## 実行方法
```bash
cd backend
python scripts/demo_rag.py --provider [mock | ollama | azure_openai]
```
