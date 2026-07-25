# Docker環境・セキュリティ基盤 — タスクリスト

## フェーズ1: セキュリティ基盤

- [x] Git除外設定（`.gitignore`, `.env.*.example`テンプレート）
- [x] `User`モデルに`must_change_password`カラム追加 + Alembicマイグレーション
- [x] 初期パスワード変更強制ガード（`deps.py`）
- [x] パスワード変更API（`POST /api/v1/auth/change-password`）
- [x] パスワードポリシーチェック（12文字以上、英大小文字・数字・記号各1）
- [x] 監査ログ記録（秘密情報除外）
- [x] `seed.py`のリセット安全策（`RESET_ADMIN_PASSWORD`環境変数）
- [x] フロントエンド: `ChangePassword.tsx`、`ProtectedRoute.tsx`ガード
- [x] API自動テスト全項目パス

## フェーズ2: Docker環境整備

- [x] frontendコンテナ内Vite起動不能の原因調査
- [x] bind mount + 名前付きVolume構成へ修正
- [x] `docker-compose.yml`: `npm ci`フォールバックcommand追加
- [x] `frontend/.dockerignore`作成
- [x] `package-lock.json`と`package.json`の整合性修正
- [x] Dockerfileで`npm ci`を使用（再現性確保）
- [x] Docker Desktop v29.6.1への更新によるポートフォワーディング問題解消
- [x] `docker-compose.yml`のobsolete `version`属性削除
- [x] 3コンテナ正常稼働確認（db, backend, frontend）
- [x] Windows側ポート疎通確認（5173, 8000）
- [x] ブラウザでログイン画面・health API確認

## フェーズ3: 実画面手動確認（確認済み）

- [x] 初期管理者でログイン
- [x] `/change-password`へ自動遷移
- [x] パスワード変更 → ホーム画面表示
- [x] F5更新後のログイン維持
- [x] ログアウト後のアクセス拒否
- [x] ログイン済みユーザーの `/login` 表示防止
- [x] 一般ユーザーで管理者API拒否（自動テスト `test_api.py` にて検証済み）
- [ ] 一般ユーザーで管理画面アクセス不可（実画面確認は未実施。フロントエンド側のルーティングガード実装後に確認予定）

## フェーズ4: Ver1.1 本実装（着手開始）

- [ ] AIコンシェルジュ「なっくん」チャットUI + FastAPI連携
- [ ] 案件一覧・詳細API
- [ ] ユーザー管理・ロール管理API
