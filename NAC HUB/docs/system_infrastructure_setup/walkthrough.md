# 修正内容の確認（Walkthrough）

開発PCおよびNACサーバー環境にて、安全・容易にシステム基盤を起動し、安定動作を確認できるように、Docker Compose、FastAPI 基盤、Alembic、および認証・権限システムを整備しました。

## 1. 実施した変更内容

*   **Docker Compose環境構築**:
    *   [docker-compose.yml](file:///d:/Antigravity/data/NAC%20HUB/docker-compose.yml) を追加し、Frontend、Backend、PostgreSQLの一発起動構成を確立。
    *   [backend/Dockerfile](file:///d:/Antigravity/data/NAC%20HUB/backend/Dockerfile) および [frontend/Dockerfile](file:///d:/Antigravity/data/NAC%20HUB/frontend/Dockerfile) の作成。
    *   環境変数を管理するルート [.env](file:///d:/Antigravity/data/NAC%20HUB/.env) の作成。
*   **FastAPI基盤の完成**:
    *   グローバル例外ハンドリング（HTTPException、バリデーションエラー、500内部エラー）を追加し、[main.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/main.py) を完成。
    *   環境変数から安全に CORS オリジンや設定情報を読み込めるよう [config.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/core/config.py) を拡張。
    *   DB接続状態（`SELECT 1`）の検証も含めたヘルスチェック API (`/health`) の実装。
*   **PostgreSQL接続 & Alembic**:
    *   [database.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/db/database.py) の DB 接続を SQLite から PostgreSQL へ切り替え可能に修正。
    *   Alembic の初期化と、全 15 テーブルを網羅する自動マイグレーション [6de9a47e8a20_initial_migrations.py](file:///d:/Antigravity/data/NAC%20HUB/backend/alembic/versions/6de9a47e8a20_initial_migrations.py) の作成。
*   **認証・権限ガード & シード**:
    *   初期データ投入用スクリプト [seed.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/db/seed.py) の実装。環境変数から初期システム管理者アカウント（`admin@example.com` など）を自動ハッシュ化して作成。
    *   [deps.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/deps.py) に管理者ガード `get_current_admin_user` 依存関係を追加。
    *   [auth.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/auth.py) にログアウト API (`/logout`) および管理者権限テスト用 API (`/admin-only`) を追加。
    *   `passlib` から Python 3.10+ で互換性の高い `bcrypt` 直接呼び出し方式に [security.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/core/security.py) をリファクタリング。
*   **タスクリストの表記修正**:
    *   [task.md](file:///d:/Antigravity/data/NAC%20HUB/docs/nac_hub_development/task.md) の「SYSTEM MODE表示の実装」と「AIコンシェルジュ『なっくん』基盤」の連結を分離。
    *   フロントエンド基盤構築を「完了（`[x]`）」にステータス更新。

---

## 2. 起動手順

### A. Docker Composeを使用する場合（推奨・NACサーバー等）
1. ワークスペースルート（`.env` が存在する場所）で以下を実行してコンテナをビルド・起動します。
   ```bash
   docker compose up --build -d
   ```
2. 起動後、バックエンドコンテナ内でデータベースマイグレーションおよび初期シードを適用します。
   ```bash
   docker compose exec backend alembic upgrade head
   # 初期シードデータ（Company, Role, 管理者）の作成
   docker compose exec backend python -m app.db.seed
   ```

### B. ローカルで個別プロセスとして起動する場合（今回の検証で実施）
1. **データベースのマイグレーション適用とシード投入**:
   ```powershell
   cd backend
   # 一時的な SQLite DB に対してマイグレーションを適用
   $env:DATABASE_URL="sqlite:///./nac_hub_temp.db"
   .\venv\Scripts\alembic upgrade head
   # シード投入（環境変数 FIRST_SUPERUSER, FIRST_SUPERUSER_PASSWORD が読み込まれます）
   .\venv\Scripts\python -m app.db.seed
   ```
2. **バックエンドサーバーの起動**:
   ```powershell
   $env:DATABASE_URL="sqlite:///./nac_hub_temp.db"
   .\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

---

## 3. 確認用URL・テスト用アカウント

| 項目 | URL / 値 | 備考 |
|---|---|---|
| **フロントエンド（通常利用）** | `http://localhost:5173` | ブラウザでアクセス |
| **バックエンド API** | `http://localhost:8000` | API直接アクセス |
| **ヘルスチェック API** | `http://localhost:8000/health` | DB 接続ステータスも確認可能 |
| **API ドキュメント (Swagger)** | `http://localhost:8000/docs` | ログインや動作確認テスト用 |

> [!NOTE]
> `host.docker.internal` はDockerコンテナ内からホストマシンへアクセスする際に使用される開発確認用のホスト名です。通常のブラウザアクセスでは `http://localhost:5173` を使用してください。

> [!IMPORTANT]
> テスト用アカウントのパスワードはローカルの `.env` ファイル（`FIRST_SUPERUSER`, `FIRST_SUPERUSER_PASSWORD`）および `test_api.py` で管理されています。確認が必要な場合はこれらのファイルを直接参照してください。

| アカウント | メールアドレス | 備考 |
|---|---|---|
| 管理者 | `.env` の `FIRST_SUPERUSER` 参照 | シードデータ (環境変数から取得) |
| 一般ユーザー | `user@example.com` | テストスクリプト内で自動作成 |
| 非活性ユーザー | `inactive@example.com` | テストスクリプト内で自動作成 |

---

## 4. 実施したテスト内容

以下の検証を行う自動テストスクリプト [test_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_api.py) を作成し、ローカル環境で実行しました。

*   **ヘルスチェックの正常性**: `/health` が `status: ok`, `database: healthy` を返すことを確認。
*   **初期管理者でのログイン**: JWT アクセストークンの正常な取得。
*   **JWT を用いた /me の認証**: 管理者アカウント情報の正常取得（ID:1, Role:1）。
*   **システム管理者権限ガード**: `/admin-only` へのアクセスが、管理者アカウントでは `200 OK` となること。
*   **一般ユーザーへの権限拒否**: 一般ユーザー（Role:2）でログインし、`/admin-only` へアクセスした際に `403 Forbidden` となりアクセスが拒否されること。
*   **無効（非活性）ユーザー拒否**: status が `inactive` のユーザーのログイン要求に対して `400 Bad Request` になること。
*   **ログアウト**: `/logout` へのリクエストが正常（`200 OK`）に終了すること。

---

## 5. 現在の状態と今後の予定

*   **フロントエンドとバックエンドの接続状況**:
    *   認証系（ログイン、ログアウト、パスワード変更、`/me` ユーザー情報取得）はフロントエンド↔バックエンドが実APIで接続済みです。
    *   ホーム画面、案件一覧、チャット等の他画面は静的モック（ダミーデータ表示）のままです。次フェーズ「① なっくんのチャットUI」以降で順次接続していきます。

