# [フェーズ④] 案件一覧・詳細画面API接続 実装計画

案件一覧画面 (`Projects.tsx`) および 案件詳細画面 (`ProjectDetail.tsx`) の静的モックデータを廃止し、バックエンドの案件管理CRUD API (`/api/v1/projects`) へ接続します。

## 概要・変更対象ファイル

1. **[NEW] [project.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/types/project.ts)**: APIレスポンス・要求パラメータのTypeScript型定義
2. **[NEW] [projects.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/api/projects.ts)**: 案件管理APIクライアント（認証付きfetch、エラーハンドリング）
3. **[MODIFY] [Projects.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Projects.tsx)**: 静的データ廃止、API連携、キーワード検索、ステータスフィルタ、ページネーション、新規作成Modal
4. **[MODIFY] [ProjectDetail.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/ProjectDetail.tsx)**: 静的データ廃止、案件詳細API接続、基本情報表示、編集Modal、管理者限定削除Modal、メンバー配属/削除、タイムライン表示/投稿

---

## 検証計画

1. **TypeScript型チェック & ビルド**: `npx tsc --noEmit`, `npm run build` (0エラー)
2. **バックエンド自動テスト**: `backend/test_projects_api.py` (11/11 PASS) 及び `backend/test_api.py` (21/21 PASS)
3. **ブラウザE2E確認**: 全15項目実機確認
