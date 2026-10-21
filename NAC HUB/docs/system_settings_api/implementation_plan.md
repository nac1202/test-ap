# 実装計画: システム設定API化 (Phase 8)

## 1. 概要
本フェーズでは、NAC HUBの基本設定画面（[frontend/src/pages/settings/System.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/System.tsx)）のモックデータを全廃し、実バックエンドAPIと接続して永続化可能にします。
社内にSE担当者が不在であることを前提とし、画面上および監査ログに技術用語・DBキー・JSON・内部ID等を一切露出させず、平易な日本語（会社名、表示設定、運用設定等）で直感的に操作できる設計とします。

---

## 2. 既存実装およびDBモデルの監査結果

### フロントエンド ([frontend/src/pages/settings/System.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/System.tsx))
- **既存の表示項目**:
  - タイトル：「システム設定」
  - 説明：「システム全体の基本表示・全社パラメータ設定を管理します。」
  - カード1：「Company マスタ情報」
    - システム表示名 (初期値: "NAC HUB")
    - コーポレートカラー (HEX) (初期値: "#F97316")
    - タイムゾーン (初期値: "Asia/Tokyo (JST)")
  - カード2：「バージョン情報」
    - バージョン: "v1.4.0" (※実際はv1.6.0)
    - ビルド番号: "#20260726"
    - 最終更新日: "2026-07-26"
  - 右上ボタン：「設定を保存」
- **改善点**:
  - 「Company マスタ情報」などのSE用語を「会社基本情報」等の非SE向け日本語に改善。
  - ホーム画面でのお知らせ表示件数、メンテナンス案内表示等の運用設定を追加。
  - バージョン情報を現行バージョン (v1.6.0) および実APIから取得する構造へ更新。
  - 保存状態（保存中スピナー、成功バナー、失敗バナー）を明示。
  - モバイル 390×844 での横スクロール防止・タップ領域（44px以上）の確保。

### バックエンドモデルおよびDB構造
- **[Company](file:///d:/Antigravity/data/NAC%20HUB/backend/app/models/company.py)**:
  - 既存カラム: `id`, `name`, `address`, `phone`, `logo_url`, `theme_color`, `timezone`, `holidays`
  - 会社基本情報の保存先として自然に利用可能。
- **[TenantSetting](file:///d:/Antigravity/data/NAC%20HUB/backend/app/models/setting.py)**:
  - 既存カラム: `id`, `company_id`, `key`, `value`, `is_secret`
  - 会社単位 (`company_id`) で追加パラメータ（システム表示名 `system_name`、お知らせ件数 `notice_display_count`、メンテナンス表示 `maintenance_mode`）を安全に格納可能。
- **マイグレーション方針**:
  - 既存テーブル `companies` および `tenant_settings` で全要件を満たせるため、**新規テーブル追加や既存テーブルのALTER/DROPマイグレーションは不要**。既存DBの整合性を完全に維持したまま安全に保存できます。

---

## 3. システム設定の役割とスコープ

- **対象**:
  - NAC HUB自体の基本設定（会社名、システム表示名、コーポレートカラー、タイムゾーン、お知らせ表示件数、メンテナンス案内表示、バージョン情報）。
- **対象外（次期プラグイン管理フェーズ）**:
  - Slack、Google Drive、NotePM、HotBiz等の外部連携認証情報。
- **秘密情報の除外**:
  - パスワード、パスワードハッシュ、JWT秘密鍵、APIキー、トークン等の機密情報は一切保存・返却しません。

---

## 4. API設計

### 1. 管理者用システム設定取得 API
- **パス**: `GET /api/v1/admin/system-settings`
- **認証**: JWT必須（システム管理者のみ `get_current_admin_user`）
- **レスポンス**:
  ```json
  {
    "company_name": "NAC System",
    "system_name": "NAC HUB",
    "theme_color": "#FF6B00",
    "timezone": "Asia/Tokyo",
    "notice_display_count": 5,
    "maintenance_mode": false,
    "version_info": {
      "version": "1.6.0",
      "build_number": "#20261021",
      "updated_at": "2026-10-21"
    }
  }
  ```

### 2. 管理者用システム設定更新 API
- **パス**: `PUT /api/v1/admin/system-settings`
- **認証**: JWT必須（システム管理者のみ `get_current_admin_user`、一般ユーザーは 403 Forbidden）
- **リクエストボディ**:
  ```json
  {
    "company_name": "NAC株式会社",
    "system_name": "NAC HUB",
    "theme_color": "#FF6B00",
    "timezone": "Asia/Tokyo",
    "notice_display_count": 5,
    "maintenance_mode": false
  }
  ```
- **バリデーション**:
  - `company_name`: 1〜100文字（空文字不可）
  - `system_name`: 1〜100文字（空文字不可）
  - `theme_color`: HEX形式 (`^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`)
  - `timezone`: 許容タイムゾーン（"Asia/Tokyo" 等）
  - `notice_display_count`: 1〜50
  - `maintenance_mode`: boolean
- **監査ログ**:
  - `AuditLog` に `action="update_system_settings"` を記録。
  - 非SE向け日本語で変更点を記録（例: `会社名: NAC System → NAC株式会社 / システム表示名: NAC HUB`）。

### 3. 公開用システム設定取得 API (一般ユーザー・未ログイン可)
- **パス**: `GET /api/v1/system-settings/public`
- **内容**: システム名、テーマカラー、バージョン情報などの非機密情報のみを返却。

---

## 5. フロントエンド改修計画

1. **型定義追加 ([frontend/src/types/admin.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/types/admin.ts))**:
   - `SystemSettingsResponse`, `SystemSettingsUpdateParams`, `SystemVersionInfo`
2. **APIクライアント追加 ([frontend/src/api/admin.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/api/admin.ts))**:
   - `fetchSystemSettings()`, `updateSystemSettings(data)`
3. **UI接続 ([frontend/src/pages/settings/System.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/System.tsx))**:
   - モック値を全廃し、マウント時に `fetchSystemSettings()` で実データを取得。
   - フォーム入力状態管理 (`useState`)。
   - 「設定を保存」ボタン押下時に `updateSystemSettings(data)` を呼び出し。
   - 処理中（スピナー、ボタン無効化）、成功メッセージ、エラーメッセージのトースト/アラート表示。
   - F5再読み込み時にも保存値が反映されることを担保。
   - モバイル390×844でのレスポンシブ最適化。

---

## 6. 自動テスト計画 ([backend/test_system_settings_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_system_settings_api.py))

以下の10項目を網羅するテストスクリプトを作成：
1. 未認証GET → 401 Unauthorized
2. 管理者GET → 200 OK
3. 一般ユーザー更新拒否 → 403 Forbidden
4. 管理者更新成功 → 200 OK
5. 更新後再取得で値が維持されることの確認
6. 別会社設定混入なし（マルチテナント会社スコープ分離の検証）
7. 不正入力拒否（空文字、不正HEXカラー、範囲外数値等で 422 Unprocessable Entity）
8. 監査ログ記録確認（非SE向け日本語内容が AuditLog に保存されること）
9. 秘密情報非露出（パスワード、JWTシークレット、DB URL等がレスポンスに含まれないこと）
10. 未設定時の安全な初期値確認（TenantSettingが空でもデフォルト値が返ること）

---

## 7. 検証および回帰テスト
- フロントエンド型チェック: `npx tsc --noEmit`
- プロダクションビルド: `npm run build`
- リンターチェック: `npm run lint`
- バックエンドテスト: `test_system_settings_api.py` および既存回帰テスト
