# 追加開発フェーズ10「なっくん外部AI仮接続・デモ版」実装計画（完了・v1.9.0）

**ステータス: 完了**（実通信E2E PASS／正式バージョン v1.9.0／タグ `v1.9-nakkun-external-ai`）。
次フェーズ以降の残存項目: 案件DB検索、NotePM／Google Drive／Slack／HotBiz実接続、社内情報横断検索、会社用OpenAI切替、秘密情報の管理機構、ストリーミング回答。外部AI接続と社内データ検索は別物。

## 1. 目的
なっくんを個人のOpenAI API Projectへ一時的に接続し、プレゼンで実際のAI回答を体験できる状態にする。
後から会社運用のアカウントへ、**環境変数の変更だけ**で切り替えられる設計にする。
Slack / Google Drive / NotePM / HotBiz などの連携、Web検索、ファイル検索は今回行わない。

## 2. 既存実装の監査結果
- `ai_assistant.py`: `POST /chat`（モック回答）、`GET/DELETE /history`。1送信で `ai_chat_histories` 1件＋`ai_execution_logs` 1件。
- `ai_execution_logs`: `used_plugins(JSON)` / `used_data` / `process_details` のみ。**provider等の専用列なし → `process_details` の文字列に非機密メタ情報を保存（migrationなし）**。
- 履歴は `user_id` で分離（ユーザーは1社所属のため他会社の履歴は混入しない）。
- 既存テスト `test_api.py` は、全 `ai_execution_logs` に `password` / `token` / `secret_key` が含まれないことを検証している（assertは弱めない）。
  → 実行ログのキー名は `token` を含まない `input_usage` / `output_usage` とした。
- `Chat.tsx`: 送信中多重送信防止、初期質問の1回消費（無限ループ対策）、履歴復元、削除、モバイルスクロール構造。これらは変更しない。

## 3. 設計
### 3.1 Provider層 `backend/app/services/ai/`
| ファイル | 役割 |
|---|---|
| `base.py` | `AIProvider` 抽象、`AIReply`、`AIProviderError(kind)` |
| `mock_provider.py` | 既存モック回答ロジックの移設 |
| `openai_provider.py` | 公式SDK・Responses API。エラーを種別へ分類 |
| `factory.py` | Provider選択・フォールバック制御・モード判定 |
| `history.py` | 会話履歴の組み立て（上限）・秘密情報らしき値の除外 |
| `instructions.py` | なっくんの基本指示 |

Azure OpenAI 等の追加は `factory.get_provider()` へProviderを足すだけ。

### 3.2 OpenAI Responses API
SDKのシグネチャを確認して使用（`openai==3.39.0`）：
`model` / `instructions` / `input` / `max_output_tokens` / `reasoning` / `store=False`。
`tools` は渡さない（外部検索・ファイル検索なし）。`reasoning` は `OPENAI_REASONING_EFFORT` が空なら送らない。

### 3.3 環境変数
| 名前 | 既定 | 説明 |
|---|---|---|
| `AI_PROVIDER` | `mock` | `mock` / `openai`（不明値は `mock`） |
| `OPENAI_API_KEY` | 未設定 | **バックエンドのみ**。SecretStr |
| `OPENAI_MODEL` | `gpt-6-luna` | 品質重視時は `gpt-6.1-sol` 等へ変更 |
| `OPENAI_REASONING_EFFORT` | `low` | 空文字で `reasoning` 非送信 |
| `OPENAI_TIMEOUT_SECONDS` | `30` | |
| `OPENAI_MAX_OUTPUT_TOKENS` | `1200` | |
| `OPENAI_MAX_RETRIES` | `1` | SDK自動リトライの上限（無限リトライ禁止） |
| `AI_HISTORY_MAX_TURNS` | `10` | モデルへ渡す履歴の往復数上限 |
| `AI_HISTORY_MAX_CHARS` | `6000` | 同・文字数上限 |

`.env.example` にはプレースホルダーのみ。実キーは `backend/.env.ai`（`.gitignore` の `backend/.env*` で除外・フロントエンドコンテナへ渡らない）に置く。

### 3.4 フォールバック
`api_key_missing` / `timeout` / `connection_error` / `rate_limit(429)` / `server_error(5xx)` / `auth_error(401/403)` / `bad_request` / `invalid_response` / `unexpected`
→ すべて MockProvider で回答し `fallback_used=true`。画面には
「外部AIへ接続できなかったため、一時的に簡易回答モードで回答しています。」
ログには**種別とステータスコードと例外クラス名のみ**（例外メッセージにはキー断片が含まれ得るため記録しない）。

### 3.5 APIレスポンス（後方互換）
`POST /api/v1/ai/chat` に `mode`（mock/external/fallback）、`provider`、`fallback_used`、`warning` を追加。
`GET /api/v1/ai/status` は外部通信なしでモード判定（`mock` / `external` / `fallback`）。モデル名・キーは返さない。

### 3.6 実行ログ（`process_details`）
- モック単独: 従来どおり `mock_response`
- それ以外: `requested=…;provider=…;model=…;success=…;fallback=…;error=…;latency_ms=…;input_usage=…;output_usage=…`
- フォールバック時は先頭に `mock_response` を付与。
- APIキー、Authorization、プロンプト全文、質問・回答本文は保存しない。

### 3.7 画面
`Chat.tsx` の注記をAPIの実モードで切替（モック／外部AI（社内データには未接続）／一時的にモックへ切替）。
APIキー未設定で「外部AI接続済み」とは表示しない。

## 4. 非対象（今回やらないこと）
- プラグイン管理画面へのAPIキー入力UI（会社運用前に別フェーズで実装）
- Slack / Drive / NotePM / HotBiz 連携、Web検索、ファイル検索、エージェント基盤
- 正式バージョン更新・正式タグ作成
