# 通知・お知らせ API化 完了報告 (Walkthrough)

## 実装内容
- **DB設計**
  - 新規に全社お知らせ用モデル `Notice` を追加
  - 通知は既存の `Notification` モデルを引き続き使用
  - (※ローカルDB停止につき、Alembicマイグレーションは実施見送り)

- **バックエンド API**
  - **Notice API** (`/api/v1/notices`)
    - 全社向けの「お知らせ」一覧取得API
    - 管理者による作成・編集・削除(無効化)API
    - 監査ログ (AuditLog) 記録実装
  - **Notification API** (`/api/v1/notifications`)
    - ログインユーザー本人の「通知」一覧取得API
    - 未読件数取得、既読化、全件既読化機能

- **フロントエンド**
  - `Notices.tsx` : モックデータを削除し実API `/api/v1/notices` に接続。
  - `Notifications.tsx` : モックデータを削除し実API `/api/v1/notifications` に接続。
  - `MockLayout.tsx` : ヘッダーの通知ベルアイコンに、実APIからの未読件数バッジを追加。
  - `Home.tsx` : 「重要なお知らせ」セクションを全社お知らせ(Notice)に変更し、リンク先を `/notices` へ修正。

- **API Unit Test**: `test_notifications_api.py`, `test_notices_api.py` (※コード作成済。Docker/DB接続不可のため実行スキップ)

## 残項目 (手動E2E待ち)
ユーザー様での「手動E2Eテスト」待ち状態です。
DB(Docker)の起動後、以下の確認をお願いいたします。
1. Alembicのマイグレーション生成および適用 (`alembic revision --autogenerate -m "Add notices table"`)
2. 新規通知APIの正常動作およびUI反映確認
3. 本人以外の通知が混入しないことの確認
4. お知らせAPIおよび監査ログの確認

## 次回のアクション
E2Eテストで問題がなければ、正式タグ (`v1.6`等) を打ち、バージョンを確定させます。
