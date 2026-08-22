# 通知センター・お知らせ機能 API化 計画

本実装計画は、NAC HUBの「お知らせ・通知センター」のバックエンドAPI実装およびフロントエンド接続を行うためのものです。
「自動で進めてください」というご指示に基づき、この計画書作成後、直ちに実装を進めます。

## 概要

現在UIモックとして実装されている「通知センター」および「お知らせ」画面を実データに接続します。
バックエンドDB（PostgreSQL）にアクセスできない環境（Docker未起動）が検知されたため、DBマイグレーションの実行やローカルでのPython/DBテスト実行はスキップし、実装コード（モデル、API、テスト、UI結合）の追加および静的チェック（TypeScript, Lint, Build）のみを実行します。

## 1. データモデルの追加と整備

既存の `Notification` モデル（個人の通知）に加え、全社向けのお知らせを管理するための `Notice` モデルを新規作成します。

### 新規モデル (`app/models/notice.py`)
- `id`: 整数 (PK)
- `company_id`: 整数 (FK: companies.id)
- `title`: 文字列 (タイトル)
- `body`: 文字列 (本文)
- `category`: 文字列 (分類：全社、総務、システム等)
- `is_important`: 真偽値 (重要フラグ)
- `is_active`: 真偽値 (公開フラグ。削除の代わりに使用)
- `created_at`, `updated_at`

### 既存モデル (`app/models/notification.py`) - そのまま利用
- `user_id`: 整数
- `type`: 文字列 (カテゴリ等)
- `title`: 文字列
- `body`: 文字列
- `is_read`: 真偽値
- `created_at`

## 2. APIエンドポイントの追加

### 通知API (`/api/v1/notifications`)
- `GET /`: 本人の通知一覧取得（ページネーション対応）
- `GET /unread-count`: 未読件数取得
- `PATCH /{id}/read`: 特定の通知を既読化
- `PATCH /read-all`: 全件既読化

### お知らせAPI (`/api/v1/notices`)
- `GET /`: 全社お知らせ一覧取得（company_idでフィルタリング）
- `GET /{id}`: 詳細取得
- `POST /` (管理者のみ): お知らせの作成（監査ログ記録）
- `PUT /{id}` (管理者のみ): お知らせの更新（監査ログ記録）

## 3. フロントエンドの接続

### 1. `Notifications.tsx`
- `/api/v1/notifications` に接続し、未読/既読を判定。既読化APIを呼び出す処理を追加。

### 2. `Notices.tsx`
- `/api/v1/notices` に接続し、一覧を表示。管理者向けに「作成」「編集」ボタンおよびモーダルを追加。

### 3. `Home.tsx` の整合性修正
- 「重要なお知らせ」セクションを `Notices` データを取得するように修正し、リンク先を `/notices` へ変更します。

### 4. `MockLayout.tsx` (ヘッダーのベルアイコン)
- マウント時に `/api/v1/notifications/unread-count` を取得し、バッジに件数を表示します。未読が0の場合はバッジを非表示にします。

## 4. 自動テストと静的チェック
- `backend/test_notifications_api.py` および `backend/test_notices_api.py` を作成し、認証やアクセス制御、データ分離のテストを記述します。
- `npx tsc --noEmit`, `npm run build`, `npm run lint` を実行し、フロントエンドの型やビルドエラーがないか確認します。
