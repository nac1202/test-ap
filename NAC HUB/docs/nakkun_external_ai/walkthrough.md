# 追加開発フェーズ10「なっくん外部AI仮接続・デモ版」ウォークスルー

**ステータス: 実装済み・APIキー設定／実通信E2E待ち**（正式バージョン v1.8.0・タグは未更新）

## 実装内容
- `backend/app/services/ai/`: Provider層（base / mock / openai / factory / history / instructions）。
- `ai_assistant.py`: Provider経由へ変更。`GET /api/v1/ai/status` を追加。レスポンスへ `mode` / `provider` / `fallback_used` / `warning` を追加（後方互換）。
- `core/config.py`: `AI_PROVIDER` ほかAI設定。`OPENAI_API_KEY` は `SecretStr`、`backend/.env.ai` も読み込み。
- `requirements.txt`: `openai==3.39.0`。
- `.env.example`: プレースホルダーのみ。
- `Chat.tsx`: 回答モード表示を実モードで切替。フォールバック時は回答下に注意文。

## 秘密情報保護
- APIキーは backend の環境変数のみ。React/Vite・ブラウザ・DB・`plugin_configs`・監査ログ・ログ・レスポンスへ出さない。
- テストで、キー値が「レスポンス／ログ／DB（実行ログ・履歴・監査ログ・plugin_configs）／設定repr」に含まれないことを検証。
- 会話履歴・質問中の秘密情報らしき値（`sk-…`、`Bearer …`、JWT、`password:` 等、`postgresql://…`）は除外してからモデルへ送信。

## 自動テスト
- 新規 `test_ai_provider_api.py`（19関数／要件20項目をカバー）: ALL PASS。OpenAI実APIは呼ばない（SDKクライアントを差し替え、実クライアント生成を検知して失敗させる）。`nac_hub_test` のみ使用。終了時に自分の履歴・実行ログ・監査ログを削除し設定を復元（テスト間干渉防止）。
- 既存全バックエンドテスト＋新規＝10ファイルを同一条件で2回連続実行して全PASS。
- tsc / build / lint: PASS（lint警告1件は既存 `AuthContext.tsx`）。

## ユーザーがAPIキーを設定する手順
1. `NAC HUB/backend/.env.ai` を新規作成（Gitに入らないファイル）。次の3行を書く（`...` は実キーに置換。ターミナルやチャットへ貼らないこと）:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=...
   OPENAI_MODEL=gpt-6-luna
   ```
2. バックエンドを再起動: `docker compose restart backend`（SDK未導入環境の場合は `docker compose build backend` の後に `docker compose up -d backend`。`docker compose down -v` は使わない）。
3. `http://localhost:8000/health` が正常であることを確認。
4. モデルを変える場合は `OPENAI_MODEL` を変更して再起動（例: `gpt-6.1-sol`）。モック回答へ戻す場合は `AI_PROVIDER=mock`。

## 実通信E2E確認項目（ユーザー実施）
1. キー設定前（`AI_PROVIDER=mock`）: 「モック回答モード」表示・従来回答。
2. `AI_PROVIDER=openai` かつキー設定後: 「外部AI回答モード」表示、実際のAI回答（日本語・結論先出し）。
3. 「Slackで検索して」等: 未接続であることを正直に答える。
4. 質問1件につき質問・回答が1件ずつ表示、F5後も履歴復元、「新しい会話」で削除。
5. キーを一時的に外す／不正値にする: 画面が壊れず「簡易回答モードで回答しています」と表示。
6. 390×844 でスクロール・送信が正常。
7. 監査ログ・画面・ブラウザ開発者ツールのネットワークにAPIキーが現れない。

## 残存未実装項目
- APIキーの安全な入力・保管機構（会社運用前に別フェーズ）。
- 会社アカウントへの切替手順の整備（現状は環境変数の差し替え）。
- 各プラグイン連携・社内実データの参照、ストリーミング応答。
- 実通信E2E確認（ユーザー実施）。
