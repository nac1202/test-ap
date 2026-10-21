# タスクリスト: システム設定API化 (Phase 8)

- [x] 1. 開始時環境確認およびDBバックアップ状況の記録 <!-- id: 0 -->
    - [x] Gitステータス確認 (NAC HUB配下Clean、コミット53f7205、タグv1.6-notices-notifications-api確認) <!-- id: 1 -->
    - [x] Docker/DBコンテナ状態確認 (Docker停止中検知、正確な報告準備) <!-- id: 2 -->
    - [x] 既存DBバックアップファイル確認 (最新: `NAC_HUB_v1.6_final_20260822_222953.sql`) <!-- id: 3 -->
- [x] 2. 既存実装およびDBモデルの監査 <!-- id: 4 -->
    - [x] フロントエンドUI監査 (`System.tsx`、既存モック値、入力項目、モバイルUI) <!-- id: 5 -->
    - [x] バックエンドモデル監査 (`Company`, `TenantSetting`, `AuditLog`, `admin_management.py`) <!-- id: 6 -->
- [x] 3. ドキュメント作成 <!-- id: 7 -->
    - [x] `docs/system_settings_api/task.md` <!-- id: 8 -->
    - [x] `docs/system_settings_api/implementation_plan.md` <!-- id: 9 -->
- [x] 4. バックエンド実装 <!-- id: 10 -->
    - [x] システム設定スキーマおよびエンドポイント実装 (`backend/app/api/routers/system_settings.py`) <!-- id: 11 -->
    - [x] `backend/app/main.py` へのルーター登録 <!-- id: 12 -->
    - [x] 監査ログ記録処理（非SE向け日本語サマリ）<!-- id: 13 -->
- [x] 5. フロントエンド実装 <!-- id: 14 -->
    - [x] 型定義追加 (`frontend/src/types/admin.ts`) <!-- id: 15 -->
    - [x] APIクライアント追加 (`frontend/src/api/admin.ts`) <!-- id: 16 -->
    - [x] システム設定UIの実API接続・非SE日本語化・状態表示・レスポンシブ調整 (`frontend/src/pages/settings/System.tsx`) <!-- id: 17 -->
- [x] 6. 自動テスト作成および検証 <!-- id: 18 -->
    - [x] 新規ユニットテスト作成 (`backend/test_system_settings_api.py`) <!-- id: 19 -->
    - [x] フロントエンド型チェック (`npx tsc --noEmit`) <!-- id: 20 -->
    - [x] フロントエンドビルド (`npm run build`) <!-- id: 21 -->
    - [x] フロントエンドLint (`npm run lint`) <!-- id: 22 -->
- [x] 7. ドキュメント更新およびコミット <!-- id: 23 -->
    - [x] `docs/system_settings_api/walkthrough.md` 作成・更新 <!-- id: 24 -->
    - [x] バックアップコミット (`feat: connect system settings to API` e72e0ff) <!-- id: 27 -->
- [x] 8. Docker起動後の残検証・回帰テスト・検証完了コミット <!-- id: 28 -->
    - [x] Docker起動状態・ヘルスチェック確認 (3コンテナUp, /health正常) <!-- id: 29 -->
    - [x] 開発DBバックアップ取得 (`NAC_HUB_pre_system_settings_e2e_20261021_201825.sql`) <!-- id: 30 -->
    - [x] 公開設定API機密性・用途監査 <!-- id: 31 -->
    - [x] 新規テスト実行 (`test_system_settings_api.py` 全11件PASS) <!-- id: 32 -->
    - [x] 既存回帰テスト実行 (全7ファイルPASS) <!-- id: 33 -->
    - [x] フロントエンド静的検証 (tsc, build, lint 全PASS) <!-- id: 34 -->
    - [x] 検証完了コミット (`fix: finalize system settings API verification` f0df172) <!-- id: 35 -->
- [x] 9. 手動E2Eフィードバック対応 (共通UI反映・ビルド番号統一・お知らせ件数連携・監査ログ表示) <!-- id: 36 -->
    - [x] ダッシュボードお知らせ件数動的制限 (`backend/app/api/routers/dashboard.py`) <!-- id: 37 -->
    - [x] バージョン・ビルド番号定義の統一 (`backend/app/api/routers/system_settings.py`) <!-- id: 38 -->
    - [x] 共通設定Context新設 (`frontend/src/contexts/SystemConfigContext.tsx`) <!-- id: 39 -->
    - [x] App.tsx への Provider 導入 (`frontend/src/App.tsx`) <!-- id: 40 -->
    - [x] サイドバー・モバイルドロワーへのシステム表示名＆ビルド番号反映 (`frontend/src/components/layout/Sidebar.tsx`) <!-- id: 41 -->
    - [x] ログイン画面へのシステム表示名反映 (`frontend/src/pages/Login.tsx`) <!-- id: 42 -->
    - [x] システム設定画面での即時反映連携 (`frontend/src/pages/settings/System.tsx`) <!-- id: 43 -->
    - [x] 監査ログ詳細キーの日本語化定義追加 (`frontend/src/pages/settings/Audit.tsx`) <!-- id: 44 -->
    - [x] バックエンド新規テスト追加＆全回帰テスト実行 <!-- id: 45 -->
    - [x] フロントエンド静的検証 (tsc, build, lint) <!-- id: 46 -->
    - [x] コミット (`fix: apply public system settings across shared UI` c37bd7b) <!-- id: 47 -->
- [x] 10. メンテナンス案内バナーの実装と共通画面反映 <!-- id: 48 -->
    - [x] メンテナンス案内バナーコンポーネント新設 (`frontend/src/components/ui/MaintenanceBanner.tsx`) <!-- id: 49 -->
    - [x] 共通レイアウトへのバナー配置 (`frontend/src/components/layout/MockLayout.tsx`) <!-- id: 50 -->
    - [x] ログイン画面へのバナー配置 (`frontend/src/pages/Login.tsx`) <!-- id: 51 -->
    - [x] public APIのmaintenance_modeテスト追加・実行 (`backend/test_system_settings_api.py`) <!-- id: 52 -->
    - [x] 全バックエンド回帰テスト実行 <!-- id: 53 -->
    - [x] フロントエンド静的検証 (tsc, build, lint) <!-- id: 54 -->
    - [x] コミット (`fix: display maintenance banner across layouts when maintenance_mode is enabled`) <!-- id: 55 -->





