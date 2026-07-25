# Docker環境セキュリティ強化と初期パスワード変更必須化の実装計画

Docker DesktopおよびWSL2への移行に伴い、秘密情報の隠蔽、環境変数ファイルの適切な管理、および本番環境を意識したセキュリティポリシー（初期管理者パスワードの強制変更）を導入します。また、Windowsホストからコンテナへの接続トラブルを解消します。

---

## ユーザー確認・検討事項

> [!IMPORTANT]
> **初期パスワード変更必須化の仕様について**
> - 今回は、`User` テーブルに `must_change_password` (Boolean) カラムを追加し、初期管理者作成時に `True` とします。
> - ログイン時にこのフラグが `True` の場合、フロントエンド側でパスワード変更画面（新規作成）へ強制遷移させ、変更が完了するまで他の機能（案件一覧など）の利用を制限する設計とします。
> - データベーススキーマが変更されるため、Alembicマイグレーションを生成して適用します。

---

## 提案される変更点

### 1. セキュリティ対策と環境変数管理の強化

#### [NEW] [`.gitignore`](file:///d:/Antigravity/data/NAC%20HUB/.gitignore)
- ワークスペースルートに `.gitignore` を作成し、`.env` および `.env.*` (ただし `.env.example` を除く) を Git 管理対象外に指定します。

#### [MODIFY] [`.env`](file:///d:/Antigravity/data/NAC%20HUB/.env)
- `SECRET_KEY` を十分に長いランダム値（例: 64文字の16進数文字列）へ変更します。
- `POSTGRES_PASSWORD` を `postgres` から強固な値（例: `NacHubPostgres2026!`）に変更します。
- `FIRST_SUPERUSER_PASSWORD` を強固な値（例: `NacHubAdminSecure2026#`）に変更します。

#### [NEW] [`.env.example`](file:///d:/Antigravity/data/NAC%20HUB/.env.example)
- 開発者向けのテンプレートファイルを作成します。実際の機密情報は含めず、プレースホルダーやダミー値を設定します。

#### [NEW] [`.env.production`](file:///d:/Antigravity/data/NAC%20HUB/.env.production) / [`.env.test`](file:///d:/Antigravity/data/NAC%20HUB/.env.test)
- 本番用、検証用の環境変数テンプレートを準備し、環境ごとの分離を明確にします。

---

### 2. 初期パスワード変更必須化の仕組み

#### [MODIFY] [`backend/app/models/user.py`](file:///d:/Antigravity/data/NAC%20HUB/backend/app/models/user.py)
- `must_change_password = Column(Boolean, default=False, nullable=False)` を追加します。

#### [NEW] [`backend/alembic/versions/xxxx_add_must_change_password.py`](file:///d:/Antigravity/data/NAC%20HUB/backend/alembic/versions)
- カラム追加のためのマイグレーションファイルを生成・適用します。

#### [MODIFY] [`backend/app/db/seed.py`](file:///d:/Antigravity/data/NAC%20HUB/backend/app/db/seed.py)
- 初期管理者アカウントの作成時に `must_change_password=True` に設定するよう修正します。

#### [MODIFY] [`backend/app/api/routers/auth.py`](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/auth.py)
- `/login` レスポンス、およびJWTトークンのペイロードに `must_change_password` を含めるようにします。

#### [MODIFY] [`frontend/src/contexts/AuthContext.tsx`](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/contexts/AuthContext.tsx)
- ログインユーザー情報に `must_change_password` を追加し、フラグの状態を保持します。

#### [NEW] [`frontend/src/pages/ChangePassword.tsx`](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/ChangePassword.tsx)
- パスワード変更専用の画面を新規作成します。

#### [MODIFY] [`frontend/src/components/ProtectedRoute.tsx`](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/ProtectedRoute.tsx)
- `must_change_password` が `True` の場合、パスワード変更画面以外のルートにアクセスした際に強制的に `/change-password` へリダイレクトするガードロジックを追加します。

---

### 3. Windowsホスト接続トラブルの解決

- WSL2のネットワークフォワーディングに不具合が生じている可能性があるため、以下の手順を実行します。
  1. `wsl --shutdown` を実行し、WSL2環境を一度クリーンに停止します。
  2. 再度コンテナをビルドおよび起動します。
  3. `curl http://localhost:8000/health` がWindows側から到達できるか再確認します。

---

## 検証計画

### 自動テスト
- `docker compose exec backend pytest` でAPIテストを再実行し、ログインロジックの修正に伴うエラーが発生しないか検証します。

### 手動検証
- ブラウザで `http://localhost:5173` を開き、初期管理者でログインを試みます。
- ログイン後、強制的にパスワード変更画面へ遷移することを確認します。
- パスワードを変更後、通常のダッシュボード画面や案件一覧画面へ遷移できることを確認します。

> [!NOTE]
> `host.docker.internal` はDockerコンテナ内からホストマシンへアクセスする際に使用される開発確認用のホスト名です。通常のブラウザアクセスでは `http://localhost:5173` を使用してください。
