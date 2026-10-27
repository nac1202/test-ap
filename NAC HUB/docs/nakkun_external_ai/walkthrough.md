# 追加開発フェーズ10「なっくん外部AI仮接続・デモ版」ウォークスルー

**ステータス: 完了**（正式バージョン v1.9.0・タグ `v1.9-nakkun-external-ai`・実通信E2E PASS）

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
2. バックエンドを再作成して反映: `docker compose up -d backend`（`docker-compose.yml` が `backend/.env.ai` を任意の env_file として読み込む。ファイルが無くても起動できる）。`docker compose down -v` は使わない。
   - openai SDK は `requirements.txt` から Docker build で自動インストールされる（手動 pip install は不要）。コンテナを作り直す前にイメージを更新する場合は `docker compose build backend`。
   - `backend/.dockerignore` により `.env*` はイメージへ焼き込まれない。`.env.ai` は frontend コンテナへ渡らない。
3. 設定状況を**値を表示せずに**確認: `docker exec nac_hub_backend python check_ai_env.py`
   （`OPENAI_API_KEY configured: true/false`、SDK有無、`AI_PROVIDER`、`OPENAI_MODEL`、`external AI will be used: true/false` のみ表示。キーの値・文字数・先頭末尾は表示しない）。
   `http://localhost:8000/health` が正常であることも確認する。
4. モデルを変える場合は `OPENAI_MODEL` を変更して再起動（例: `gpt-6.1-sol`）。モック回答へ戻す場合は `AI_PROVIDER=mock`。

## 実通信E2E結果（ユーザー手動確認: 全項目PASS）
- OpenAI API実通信: PASS（外部AI回答モード表示・自然な日本語回答）
- 1質問につき質問1件／回答1件: PASS
- NotePM未接続を正直に回答: PASS
- NAC HUB案件データ未接続を正直に回答: PASS
- F5後の会話履歴復元: PASS／「新しい会話」で履歴削除: PASS
- 390×844で質問・回答・スクロール・送信: PASS
- 秘密情報非露出: PASS（frontend非露出・Git非追跡・dist／差分／ドキュメント／DB／実行ログに不在）
- フォールバック動作: 自動テストで確認済み
- ※APIキーの実値は記録しない。

## 最終検証（v1.9.0確定時）
- 全10バックエンドテストを同一条件で2回連続実行してPASS（`nac_hub_test` のみ・モック固定で実OpenAI APIは呼ばない）。
- tsc / build / lint PASS（lint警告1件は既存 `AuthContext.tsx`）。
- `/health`: status=ok / version=1.9.0 / database=healthy。ビルド番号 20261021 は維持。

## 参考: 実施前の確認項目（当初計画）
1. キー設定前（`AI_PROVIDER=mock`）: 「モック回答モード」表示・従来回答。
2. `AI_PROVIDER=openai` かつキー設定後: 「外部AI回答モード」表示、実際のAI回答（日本語・結論先出し）。
3. 「Slackで検索して」等: 未接続であることを正直に答える。
4. 質問1件につき質問・回答が1件ずつ表示、F5後も履歴復元、「新しい会話」で削除。
5. キーを一時的に外す／不正値にする: 画面が壊れず「簡易回答モードで回答しています」と表示。
6. 390×844 でスクロール・送信が正常。
7. 監査ログ・画面・ブラウザ開発者ツールのネットワークにAPIキーが現れない。

## 残存未実装項目（次フェーズ以降）
> 外部AI接続ができたことと、社内データ検索ができることは別。現状は一般的なAI回答のみで、社内データは参照しない。
- なっくんからNAC HUB案件DBを実際に検索する機能
- NotePM実API接続
- Google Drive実API接続
- Slack実API接続
- HotBiz実接続
- 社内情報横断検索
- 会社用OpenAIアカウント／Projectへの切替
- 秘密情報の管理画面／安全な保管機構
- ストリーミング回答
