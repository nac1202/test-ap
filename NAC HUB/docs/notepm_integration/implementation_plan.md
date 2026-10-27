# 追加開発フェーズ12 実装計画「NotePM実API接続・読み取り専用 第1弾」

## 方針
- 読み取り専用（GETのみ）。POST/PATCH/DELETEは実装しない。
- トークンは `backend/.env.integrations` → backendの環境変数 → `SecretStr`。DB・ログ・API・frontend・OpenAIへ出さない。
- 管理者が明示選択したノート（ホワイトリスト）の範囲だけ検索する。

## 構成
| 領域 | 内容 |
|---|---|
| 配線 | `docker-compose.yml` backendのみ `env_file`（required:false）。`.gitignore` / `backend/.dockerignore` で除外 |
| 設定 | `config.py` の `NOTEPM_API_TOKEN: SecretStr`。`check_integrations_env.py` は true/false のみ出力 |
| Client | `app/services/notepm/client.py`（ドメイン正規化・SSRF対策・429/401/5xx/timeout） |
| 接続確認 | `connection.py`：`GET /user/account`、read_flag / write_flag |
| 検索 | `search.py`：許可ノート内のみ・上限（ノート10／1ノート5件／最終10件／本文500字／コンテキスト3500字） |
| なっくん | `ai_assistant.py`：NotePM検索意図のみ実API。参照チップはタイトルのみ |
| 管理API | `test-connection` / `notes` / `allowed-notes`（管理者のみ） |
| 画面 | `Plugins.tsx`（接続状態・参照ノート設定モーダル）、`Chat.tsx`（モード表示） |

## エラー処理（トークン・Authorizationは含めない）
- 429：「NotePMへのアクセスが一時的に混雑しています。少し時間を置いてお試しください。」
- 401：「NotePMの認証情報を確認してください。」
- timeout / 5xx：「NotePMへ一時的に接続できません。」
- リトライなし。

## 検証
- `test_notepm_integration.py`（モックHTTP・`nac_hub_test` のみ）＋既存11ファイルを2回連続実行。
- frontend：`tsc --noEmit` / `build` / `lint`。
- 実NotePM確認は、モックテスト完了後に `GET /user/account` → `GET /notes` のみ。

## ステータス
追加開発フェーズ12 完了（Version 1.11.0・手動E2E PASS）。表示用正規化（AIへ渡す前のコピーのみ）を追加済み。残存項目は walkthrough.md を参照。
