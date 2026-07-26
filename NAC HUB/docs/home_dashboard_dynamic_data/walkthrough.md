# [フェーズ⑤] ホーム画面ウィジェットの動的データ連携 ウォークスルー

フェーズ⑤「ホーム画面ウィジェットの動的データ連携」の実装、自動テスト、およびブラウザE2E検証が完了しました。

---

## 変更内容の概要

### 1. バックエンド集約API (`GET /api/v1/dashboard`)
- **`backend/app/schemas/dashboard.py`**: `DashboardResponse`, `ProjectSummarySchema`, `RecentProjectSchema`, `NotificationSchema`, `TaskSchema`, `IntegrationsSchema` の定義。
- **`backend/app/api/routers/dashboard.py`**: ダッシュボード集約APIエンドポイント。
  - JWT認証必須。初期パスワード未変更時のアクセス制御を維持。
  - 会社単位スコープ (`User.company_id`) で案件数 (`total`, `normal`, `warning`, `delayed`, `due_soon`) を集計。
  - ユーザー単位スコープ (`RecentProject.user_id == current_user.id`) で最新閲覧案件履歴（最大5件）を取得。
  - ユーザー単位で通知 (`Notification`) およびタスク (`Workflow`) を取得。
  - 外部未接続サービス (`weather`, `hotbiz`, `slack`, `notepm`, `google_drive`) のステータスを返却。

### 2. フロントエンド型定義・APIクライアント・Home画面
- **`frontend/src/types/dashboard.ts`**: ダッシュボードレスポンス対応の型定義。
- **`frontend/src/api/dashboard.ts`**: `fetchDashboardData(token)` 関数の作成。認証ヘッダー付与・エラー処理。
- **`frontend/src/pages/Home.tsx`**: 
  - 静的モックデータを完全に削除し、`GET /api/v1/dashboard` の動的データへ接続。
  - ログイン中ユーザー名および時間帯に応じた挨拶を動的表示。
  - 案件サマリーカードを動的数値で表示。クリックで `/projects` へ遷移。
  - 最近閲覧した案件・お知らせ・タスクの動的表示（0件時の適切な空状態表示メッセージを完備）。
  - 未接続の外部機能（HotBiz予定表、天気、出勤状況）について「連携準備中/未接続」を明示化。
  - なっくん入力フォーム入力から `/chat` へのスムーズな遷移。

---

## テスト・検証結果

1. **バックエンド自動テスト**:
   - `backend/test_dashboard_api.py`: **PASSED (100%)**
   - `backend/test_projects_api.py`: **PASSED (100%)**
   - `backend/test_api.py`: **PASSED (100%)**
2. **型チェック & ビルド**: `npx tsc --noEmit` & `npm run build` -> **0 Error**
3. **ブラウザE2E確認結果**: 全20項目動作確認済み。
   - ログイン・挨拶・案件サマリー表示・新規案件作成後の閲覧履歴自動更新・最近見た案件からの詳細遷移・E2Eデータ削除クリーンアップ・なっくんチャット遷移・ログアウト保護がすべて正常動作。

---

## 録画キャプチャ

![Phase 5 E2E Verification Flow](file:///C:/Users/user/.gemini/antigravity-ide/brain/afaa5ab6-ddf8-4372-a930-02c7955f2801/phase5_e2e_final_1785049088258.webp)
