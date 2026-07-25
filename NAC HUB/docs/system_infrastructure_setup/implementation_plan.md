# 実装計画：システム基盤の安定化と初期設定

開発環境およびNACサーバーの両方でシステムを容易に起動し、安定して動作させるためのシステム基盤（Docker, FastAPI, PostgreSQL, Alembic, 認証・権限）を構築します。

## Goal
*   `docker-compose.yml` を用いて、frontend, backend, PostgreSQL が一発で起動・連携できるコンテナ環境を構築する。
*   FastAPI の CORS、グローバル例外処理、DB接続確認を含むヘルスチェック API を完成させる。
*   PostgreSQL を使用した DB 接続に切り替え、Alembic を用いて 15 テーブルすべてのマイグレーションおよびロールバックを検証する。
*   環境変数から設定された初期管理者アカウントおよび初期データ（Company, Role）を投入するシード機能を実装する。
*   JWT認証および権限管理（システム管理者ガード、無効ユーザー拒否、トークン有効期限、ログアウト処理）を実データベースと連携して動作確認する。
*   タスクリストの表記修正およびフロントエンド基盤構築の完了ステータス更新を行う。

## User Review Required
> [!IMPORTANT]
> - 初期管理者アカウントのログイン情報（ID/パスワード）は、環境変数 `FIRST_SUPERUSER` および `FIRST_SUPERUSER_PASSWORD` を通じて `.env` から設定可能とします。
> - システム管理画面へのアクセス制限は、バックエンド側でのロール権限確認の依存関係（`get_current_admin_user`）およびフロントエンドのルーティングガード（モック画面内でのチェック）で対応します。

## Proposed Changes

### Docker環境の構築
---
#### [NEW] [docker-compose.yml](file:///d:/Antigravity/data/NAC%20HUB/docker-compose.yml)
*   `frontend`, `backend`, `db` (PostgreSQL 15) を定義。
*   開発環境でのホットリロードを有効にするため、ローカルディレクトリのマウントおよび環境変数を設定。

#### [NEW] [backend/Dockerfile](file:///d:/Antigravity/data/NAC%20HUB/backend/Dockerfile)
*   Python 3.11 ベースの Dockerfile。
*   `requirements.txt` のインストール、ホットリロード対応のための `uvicorn app.main:app --host 0.0.0.0 --reload` 起動。

#### [NEW] [frontend/Dockerfile](file:///d:/Antigravity/data/NAC%20HUB/frontend/Dockerfile)
*   Node.js ベースの Dockerfile。
*   Vite 開発サーバーを `0.0.0.0` ポート `5173` で起動する設定。

#### [NEW] [backend/requirements.txt](file:///d:/Antigravity/data/NAC%20HUB/backend/requirements.txt)
*   依存パッケージ（`fastapi`, `uvicorn`, `sqlalchemy`, `psycopg2-binary`, `python-jose[cryptography]`, `passlib[bcrypt]`, `pydantic-settings`, `python-dotenv`, `python-multipart`, `alembic`）を記載。

### FastAPI基盤・DB接続・Alembic
---
#### [MODIFY] [config.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/core/config.py)
*   SQLite から PostgreSQL への DB 接続 URL (`DATABASE_URL`) の変更に対応。
*   初期管理者情報、CORS設定、JWT of シークレットキー、有効期限などを環境変数から安全に読み込めるよう Pydantic Settings を拡張。

#### [MODIFY] [database.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/db/database.py)
*   PostgreSQL 接続設定への切り替え。SQLite 特有の引数 (`check_same_thread`) を PostgreSQL の場合は除外。

#### [MODIFY] [main.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/main.py)
*   起動時の自動テーブル作成 (`Base.metadata.create_all`) を削除（Alembicに移行）。
*   グローバル例外ハンドラー（FastAPI `HTTPException`, データベースエラー, 一般エラー等）を追加し、統一された JSON エラーレスポンスを返すようにする。
*   `/health` API を拡張し、DBのヘルスチェック（`SELECT 1`）も合わせて実施するようにする。

#### [NEW] [alembic.ini](file:///d:/Antigravity/data/NAC%20HUB/backend/alembic.ini) / [backend/alembic/](file:///d:/Antigravity/data/NAC%20HUB/backend/alembic)
*   Alembic 初期化とメタデータ・DB接続の設定（`env.py` の修正）。
*   `DATABASE_URL` 環境変数を優先的に読み込むように `alembic/env.py` を変更。
*   `Base.metadata` を読み込み、全 15 テーブルを自動生成するマイグレーションの作成。

#### [NEW] [seed.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/db/seed.py)
*   初期データ（デフォルトCompany, デフォルトRole: "admin", "user", および環境変数から取得した初期管理者アカウント）を投入するスクリプト。
*   パスワードは `security.py` を使用して安全にハッシュ化する。

### 認証・権限管理
---
#### [MODIFY] [deps.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/deps.py)
*   `get_current_user` および `get_current_active_user` での無効ユーザーログイン拒否、トークン有効期限の検証を確実に実施。
*   システム管理者専用 API を保護するための `get_current_admin_user` 依存関係を追加（`role_id` または `role.name` を検証してシステム管理者以外を拒否）。

#### [MODIFY] [auth.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/auth.py)
*   ログアウト API エンドポイント (`/logout`) を追加（レスポンスを返し、フロントエンド側でトークンをクリアするトリガーとする）。

### ドキュメント・タスクリスト修正
---
#### [MODIFY] [task.md](file:///d:/Antigravity/data/NAC%20HUB/docs/nac_hub_development/task.md)
*   連結表記「SYSTEM MODE表示の実装シェルジュ『なっくん』基盤」を以下の通り分離：
    - `SYSTEM MODE表示の実装`
    - `AIコンシェルジュ「なっくん」基盤`
*   フロントエンド基盤構築（Vite, デザイントークン, 共通コンポーネント）の主要項目が完了しているため、ステータスを `[x]` に更新。

## Verification Plan

### Automated Tests & CLI
1. **Docker コンテナ起動検証**:
   *   `docker compose up --build -d` がエラーなく完了し、全コンテナが正常稼働することを確認する。
2. **Alembic マイグレーション & ロールバック検証**:
   *   `docker compose exec backend alembic upgrade head` でマイグレーションが正常適用されることを確認。
   *   `docker compose exec backend alembic downgrade -1` でロールバックができることを確認。
3. **初期データ投入 (Seeding)**:
   *   `docker compose exec backend python -m app.db.seed` を実行し、DBに初期データが正常投入されることを確認。

### Manual Verification
1. **APIの動作テスト**:
   *   ヘルスチェック API (`/health`) の DB 接続確認結果が `status: ok` となることを確認。
   *   初期管理者アカウントで `/api/v1/auth/login` へ POST し、JWT トークンが正しく取得できることを確認。
   *   取得した JWT を使用して `/api/v1/auth/me` でユーザー情報が正しく取得できることを確認。
2. **認証ガード・権限チェック**:
   *   status を `inactive` にしたダミーユーザーでログインおよび API アクセスが拒否されることを確認。
   *   管理者以外の一般ユーザーのトークンで、システム管理者用 API（検証用にテストエンドポイントを作成）へアクセスした際に 403 Forbidden になることを確認。
3. **フロントエンドログアウト**:
   *   フロントエンド側でログアウト時にトークンがクリアされ、ログイン画面へ遷移することを確認。
