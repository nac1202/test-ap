# Progress Summary

## 本ドキュメントの運用方針について (Single Source of Truth)
本ファイル `docs/nac_hub_development/progress_summary.md` をプロジェクトの進捗・サマリ管理の正本とします。プロジェクト直下に重複ファイルが存在する場合は削除し、二重管理を防止します。

## 現在のステータス
追加開発フェーズ8 実装済み・手動E2E待ち

## 最新の作業内容 (システム設定API化)
1. **既存モデル・DB活用**:
   - 既存の `Company` モデル（会社名、コーポレートカラー、タイムゾーン）および `TenantSetting` モデル（システム表示名、お知らせ表示件数、メンテナンス案内表示）を活用。
   - 新規テーブル追加や破壊的マイグレーション（ALTER/DROP）を行わず、会社スコープ（`company_id`）で安全に永続化。
2. **APIエンドポイント実装**:
   - `GET /api/v1/admin/system-settings` (管理者用取得API・自社スコープ・初期値フォールバック完備)
   - `PUT /api/v1/admin/system-settings` (管理者用更新API・一般ユーザー403・入力バリデーション・監査ログ記録)
   - `GET /api/v1/system-settings/public` (未認証・一般ユーザー用公開設定API)
3. **監査ログ連携**:
   - システム設定変更時に `action="システム設定変更"` として記録。
   - 非SE向け平易な日本語（例: `会社名: 「旧名」→「新名」`）で変更差分要約を保存。秘密情報は完全非露出。
4. **フロントエンド接続**:
   - `frontend/src/types/admin.ts` にシステム設定の型定義を追加。
   - `frontend/src/api/admin.ts` にAPIクライアント関数を追加。
   - `System.tsx` のモック値を全廃し、実APIと接続。
   - 非SE向け日本語UI（会社・システム基本情報、運用・表示設定、システム情報）、カラーピッカー連携、保存中スピナー・保存成功/失敗バナー、390×844レスポンシブ最適化を実装。
5. **テスト・静的チェック**:
   - `backend/test_system_settings_api.py` 作成 (全11テストケース実装)。
   - Python構文コンパイル (`py_compile`) PASS。
   - TypeScriptコンパイル (`npx tsc --noEmit`) PASS。
   - プロダクションビルド (`npm run build`) PASS。
   - リンターチェック (`npm run lint`) PASS (エラー0件)。

## 次のステップ (手動E2Eテスト待ち)
- Docker Compose環境起動後、ユーザー様にてブラウザ手動E2Eテストを実施予定。
- E2E検証完了後に正式バージョン確定（v1.7.0）およびタグ作成を実施します。

