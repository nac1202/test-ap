# Progress Summary

## 本ドキュメントの運用方針について (Single Source of Truth)
本ファイル `docs/nac_hub_development/progress_summary.md` をプロジェクトの進捗・サマリ管理の正本とします。プロジェクト直下に重複ファイルが存在する場合は削除し、二重管理を防止します。

## 現在のステータス
追加開発フェーズ7 実装および手動E2E 完了 (v1.6.0)

## 最新の作業内容 (お知らせ・通知センターAPI化)
1. **データモデル追加**:
   - `Notice` モデル (全社お知らせ用) を新設。
   - `Notification` モデル (個人通知用) をそのまま活用。
2. **APIエンドポイント実装**:
   - `/api/v1/notices` (一覧・詳細・作成・更新)
   - `/api/v1/notifications` (一覧・未読件数・既読化・全件既読化)
3. **フロントエンド接続**:
   - `MockLayout.tsx` と `Sidebar.tsx` を実API (`unread-count`) と連動し、通知バッジの表示仕様を統合。
   - `Home.tsx` の「重要なお知らせ」セクションを全社お知らせ (`Notice`) と連携し、`/notices` へのリンクに修正。
   - `Notices.tsx` および `Notifications.tsx` を実API連携へ改修。
4. **自動テスト・静的チェック**:
   - `test_notifications_api.py`, `test_notices_api.py` 実行（成功）
   - `test_api.py`, `test_projects_api.py`, `test_dashboard_api.py`, `test_admin_management_api.py` 既存回帰テスト実行（成功）
   - TypeScriptコンパイル(`npx tsc --noEmit`)、ビルド(`npm run build`)、Lint(`npm run lint`) を全てPASS。
5. **UI実装**:
   - `Notices.tsx` に全社お知らせの「新規作成」「編集」モーダルを実装完了。

## 手動E2Eテスト結果 (PASS)
- お知らせ新規作成、編集、Homeへの反映がすべて正常に動作
- 未読0件時に空状態の表示およびヘッダー・サイドバーのバッジ非表示が正常
- 通知1件作成時にヘッダー・サイドバー両方で「1」バッジの表示および同期が正常
- 通知一覧から既読化後、バッジが即座に消滅・0件表示に戻ることを確認

## 次のステップ
- v1.6 として確定し正式タグ `v1.6-notices-notifications-api` を作成済。
- フェーズ7完了により、次の追加開発フェーズへ移行します。
