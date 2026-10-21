# システム設定API化 完了報告 (Walkthrough)

## 1. 実装概要
追加開発フェーズ8「システム設定API化」として、NAC HUBの基本表示および全社運用パラメータを管理するシステム設定画面 ([frontend/src/pages/settings/System.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/System.tsx)) のモックを全廃し、実バックエンドAPIと接続しました。

NAC社内にSE担当者が不在であることを前提とし、画面上および監査ログから技術用語（JSON、DBキー、内部ID等）を完全に排除し、平易な日本語（会社名、システム表示名、コーポレートカラー、タイムゾーン、運用設定等）で直感的に操作できる設計を実現しています。

---

## 2. 実装および変更内容

### バックエンド
- **APIルーター新設 ([backend/app/api/routers/system_settings.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/system_settings.py))**:
  - `GET /api/v1/admin/system-settings`:
    - JWT認証必須（システム管理者のみ認可）
    - 自社スコープ（`current_admin.company_id`）に限定
    - 未設定時の安全な初期値（デフォルト値フォールバック）を完備
    - 秘密情報は一切レスポンスに含まない
  - `PUT /api/v1/admin/system-settings`:
    - JWT認証必須（システム管理者のみ認可、一般ユーザーは 403 Forbidden）
    - 入力バリデーション（会社名・システム名の空文字禁止、HEXカラーコード検証、表示件数1〜50件検証）
    - 監査ログ記録（`action="システム設定変更"`、非SE向け日本語で変更差分要約を記録）
  - `GET /api/v1/system-settings/public`:
    - 認証不要の公開設定エンドポイント（システム名、カラー、バージョン等の非機密情報のみ）
- **メインアプリ登録 ([backend/app/main.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/main.py))**:
  - `system_settings.router` (`/api/v1/admin`) および `system_settings.public_router` (`/api/v1`) をマウント。
- **DB設計方針**:
  - 既存モデル [Company](file:///d:/Antigravity/data/NAC%20HUB/backend/app/models/company.py)（会社名、テーマカラー、タイムゾーン）および [TenantSetting](file:///d:/Antigravity/data/NAC%20HUB/backend/app/models/setting.py)（システム表示名、お知らせ表示件数、メンテナンス案内表示）を活用。
  - **新規テーブル作成や破壊的マイグレーション（ALTER/DROP）は一切行わず**、既存スキーマの安全性を完全に維持。

### フロントエンド
- **型定義追加 ([frontend/src/types/admin.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/types/admin.ts))**:
  - `SystemSettingsResponse`, `SystemSettingsUpdateParams`, `SystemVersionInfo`, `PublicSystemSettingsResponse` を定義。
- **APIクライアント関数 ([frontend/src/api/admin.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/api/admin.ts))**:
  - `fetchSystemSettings()`, `updateSystemSettings(data)`, `fetchPublicSystemSettings()` を追加。
- **システム設定画面 ([frontend/src/pages/settings/System.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/System.tsx))**:
  - モックデータを全廃し、マウント時に実API `GET /api/v1/admin/system-settings` よりデータを取得。
  - 非SE向け日本語UI：
    - 「会社・システム基本情報」（会社名、システム表示名、コーポレートカラー、タイムゾーン）
    - 「運用・表示設定」（ホーム画面のお知らせ表示件数、メンテナンス案内バナー表示）
    - 「システム情報」（バージョン: v1.6.0、ビルド番号、最終更新日）
  - カラーピッカー連携（カラーパレットと16進数HEXコード入力の同期）。
  - 状態通知（ローディングスピナー、保存中アニメーション、保存成功バナー、エラーバナー）。
  - レスポンシブ対応（390×844 で横スクロール・ボタン欠けなし、44px以上のタッチターゲット）。

### 自動テスト
- **新規テストスクリプト ([backend/test_system_settings_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_system_settings_api.py))**:
  - 指定された全10項目＋公開APIの計11テストケースを実装：
    1. 未認証GET → 401
    2. 管理者GET → 200
    3. 一般ユーザー更新拒否 → 403
    4. 管理者更新成功 → 200
    5. 更新後再取得で値維持
    6. 別会社設定混入なし（マルチテナント会社スコープ分離）
    7. 不正入力拒否（空文字、不正カラーコード、範囲外数値で 422）
    8. 監査ログ記録確認（非SE向け日本語内容）
    9. 秘密情報非露出
    10. 未設定時の初期値確認
    11. 公開設定エンドポイント確認

---

## 3. テスト・ビルド・検証結果

| 項目 | 結果 | 備考 |
|---|---|---|
| Python構文コンパイル (`py_compile`) | **PASS** ✅ | `system_settings.py`, `main.py`, `test_system_settings_api.py` 全てエラーなし |
| TypeScript型チェック (`npx tsc --noEmit`) | **PASS** ✅ | エラー 0 件 |
| プロダクションビルド (`npm run build`) | **PASS** ✅ | Vite build 正常完了 (dist 生成確認) |
| フロントエンドLint (`npm run lint`) | **PASS** ✅ | エラー 0 件 (警告 1 件は既存 AuthContext.tsx のみ) |
| バックエンド自動テスト実行 | **保留（手動E2E時）** ⚠️ | Dockerデーモン停止中のため、PostgreSQLコンテナ起動後に実行 |

---

## 4. ユーザー手動E2E確認項目

Docker Compose環境を起動後、ブラウザから以下の項目をご確認ください：

1. **システム設定画面へのアクセス**:
   - 管理者アカウントでログイン後、サイドバーの「システム設定」(`http://localhost:5173/settings/system`) を開く。
   - 「会社名」「システム表示名」「コーポレートカラー」「タイムゾーン」「お知らせ表示件数」「メンテナンス表示」が正しく初期表示されること。
2. **設定変更と保存**:
   - 会社名やシステム表示名、カラーを変更し、「設定を保存」ボタンをクリック。
   - 「システム設定を正常に保存しました」バナーが表示されること。
3. **リロード後の値維持**:
   - ブラウザを再読み込み（F5）し、保存した値がそのまま維持されていること。
4. **監査ログの確認**:
   - サイドバー「監査ログ」(`http://localhost:5173/settings/audit`) を開く。
   - 最新ログに `アクション: システム設定変更`、詳細に「会社名: 「旧名」→「新名」」等の変更差分が平易な日本語で記録されていること。
5. **モバイル表示確認 (390×844)**:
   - スマートフォン表示幅で横スクロールやボタン欠けが発生しないこと。
