# NAC HUB — Docker環境・セキュリティ基盤 ウォークスルー

## 概要

NAC HUB Ver1.1 のセキュリティ基盤（初期パスワード変更強制、パスワードポリシー、監査ログ）を実装し、Docker開発環境の安定稼働を確保しました。

---

## 1. セキュリティ基盤の実装

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| [user.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/models/user.py) | `must_change_password` カラム追加 |
| [deps.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/deps.py) | パスワード変更強制ガード（許可API以外は403） |
| [auth.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/auth.py) | `POST /change-password` API、監査ログ記録 |
| [seed.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/db/seed.py) | `RESET_ADMIN_PASSWORD`環境変数による安全策 |
| [ChangePassword.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/ChangePassword.tsx) | パスワード変更フォーム（リアルタイムポリシーチェック） |
| [ProtectedRoute.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/ProtectedRoute.tsx) | `/change-password`強制遷移ガード |
| [test_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_api.py) | 統合テスト全項目パス |

### パスワードポリシー
- 12文字以上
- 英大文字・小文字・数字・記号を各1文字以上
- 初期パスワードと同一値は拒否

### 初期管理者パスワード

> [!IMPORTANT]
> 初期管理者パスワードはローカルの `.env` ファイルに `FIRST_SUPERUSER_PASSWORD` として設定されています。確認が必要な場合は `.env` を参照してください。チャットやドキュメントにパスワードの実値は記載しません。

---

## 2. Docker環境の問題と対応

### 問題1: Vite起動不能

**原因**: `docker-compose.yml`のbind mount (`./frontend:/workspace`) により、Dockerイメージ内で`npm install`した`node_modules`がホスト側の空ディレクトリで上書き・隠蔽されていた。

**対応**:
- 名前付きVolume `frontend_node_modules` を導入し、`/workspace/node_modules`を独立管理
- 起動時コマンドに `npm ci` フォールバックを追加（Volumeが空の場合のみ実行）
- `frontend/.dockerignore`を作成し、ビルドコンテキストから`node_modules`を除外

### 問題2: `npm ci`ビルド失敗

**原因**: `package-lock.json`と`package.json`の不整合（`@emnapi/core@1.11.2`等が欠落）。

**対応**: コンテナ内で`npm install --package-lock-only`を実行してlock fileを再生成し、ホストへコピー。Dockerfileは`npm ci`に復帰。

### 問題3: Windowsホストからのポート接続不能

**原因**: Dockerコンテナ内部ではViteが正常に応答するが、Windowsホスト側の`netstat`にポート5173/8000が一切表示されず、`Test-NetConnection`もFalseとなるポートフォワーディング不能状態。

**対応**: `wsl --shutdown`とDocker Desktop再起動により、Windows側のポートフォワーディングが復旧した。

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| [docker-compose.yml](file:///d:/Antigravity/data/NAC%20HUB/docker-compose.yml) | obsolete `version`削除、名前付きVolume、`npm ci`フォールバックcommand、デフォルト値から弱いパスワード削除 |
| [frontend/Dockerfile](file:///d:/Antigravity/data/NAC%20HUB/frontend/Dockerfile) | `npm ci` + 明示的な `--host 0.0.0.0 --port 5173` |
| [frontend/.dockerignore](file:///d:/Antigravity/data/NAC%20HUB/frontend/.dockerignore) | `node_modules`, `dist`等を除外 |
| [frontend/package-lock.json](file:///d:/Antigravity/data/NAC%20HUB/frontend/package-lock.json) | `package.json`との整合性修正 |

---

## 3. Alembicマイグレーション

| リビジョン | 説明 | 親 |
|---|---|---|
| `6de9a47e8a20` | Initial migrations | `<base>` |
| `083bb138a0fa` (head) | add must_change_password to user | `6de9a47e8a20` |

- headは1つ（`083bb138a0fa`）
- 履歴は一本の直列

---

## 4. 最終確認結果

| 確認項目 | 結果 |
|---|---|
| `docker compose ps` → 3コンテナUp | ✅ |
| `Test-NetConnection 127.0.0.1:5173` → True | ✅ |
| `Test-NetConnection 127.0.0.1:8000` → True | ✅ |
| `docker logs` → `VITE v8.1.3 ready` | ✅ |
| `/health` → `{"status":"ok","database":"healthy"}` | ✅ |
| ブラウザ → NAC HUBログイン画面表示 | ✅ |
| Alembic head → 1つ（`083bb138a0fa`） | ✅ |
| `npm ci`ビルド成功 | ✅ |
| 秘密情報がドキュメント・Git管理外 | ✅ |

---

## 5. 実画面手動確認結果

`http://localhost:5173` にてブラウザで以下を確認済み:

| 確認項目 | 結果 |
|---|---|
| 初期管理者ログイン | ✅ |
| `/change-password` への強制遷移 | ✅ |
| パスワード変更 → ホーム画面表示 | ✅ |
| F5更新後のログイン維持 | ✅ |
| ログアウト後のアクセス拒否 | ✅ |
| ログイン済みユーザーの `/login` 表示防止 | ✅ |
| 一般ユーザーの管理者API拒否 | ✅ 自動テスト済み（`test_api.py`）。実画面確認は未実施 |

## 6. 次のステップ

1. **Ver1.1 本実装**: AIコンシェルジュ「なっくん」チャットUI + FastAPI連携
