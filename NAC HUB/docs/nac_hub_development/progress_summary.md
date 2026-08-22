# Progress Summary

## 現在のステータス
追加開発フェーズ7 実装済み・手動E2E待ち

## 最新の作業内容 (お知らせ・通知センターAPI化)
1. **データモデル追加**:
   - `Notice` モデル (全社お知らせ用) を新設。
   - `Notification` モデル (個人通知用) をそのまま活用。
2. **APIエンドポイント実装**:
   - `/api/v1/notices` (一覧・詳細・作成・更新)
   - `/api/v1/notifications` (一覧・未読件数・既読化・全件既読化)
3. **フロントエンド接続**:
   - `MockLayout.tsx` ヘッダー通知ベルへ未読件数バッジ表示機能を実装。
   - `Home.tsx` の「重要なお知らせ」セクションを全社お知らせ (`Notice`) と連携し、`/notices` へのリンクに修正。
   - `Notices.tsx` および `Notifications.tsx` を実API連携へ改修。
4. **自動テスト・静的チェック**:
   - `test_notifications_api.py`, `test_notices_api.py` を実装（※Docker停止中のためテスト実行自体は未実施）
   - TypeScriptコンパイル(`npx tsc --noEmit`)、ビルド(`npm run build`)、Lint(`npm run lint`) を全てPASS。

## 残課題・ユーザー手動確認事項
- Docker/DBを起動し、Alembicマイグレーションの実行が必要です。
- アプリをブラウザで開き、手動E2Eテストをお願いいたします。
- 手動E2Eテストにて問題がなければ、正式タグ (`v1.6`等) の作成とバージョン番号確定を行ってください。
