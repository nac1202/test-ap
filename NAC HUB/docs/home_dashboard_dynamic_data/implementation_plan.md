# [フェーズ⑤] ホーム画面ウィジェットの動的データ連携 実装計画

ホーム画面 (`Home.tsx`) の静的モックデータを廃止し、バックエンドに新設した集約API (`GET /api/v1/dashboard`) を介して実際のデータベース情報（案件サマリー、閲覧履歴、通知、タスク）へ動的接続します。また、未接続の外部サービス（HotBiz予定表、天気、出勤管理）については「連携準備中/未接続」と明確に表示します。

---

## ウィジェット別データ取得・接続設計

| ウィジェット名 | データ取得元 | スコープ | 対応内容 |
|---|---|---|---|
| **挨拶 & なっくんヒーロー** | `AuthContext` + `GET /api/v1/dashboard` | ユーザー | ログイン中ユーザー名、時間帯挨拶を表示。入力から `/chat` へ遷移。 |
| **案件サマリー** | `GET /api/v1/dashboard` (`project_summary`) | 会社 | `projects` DBの集計値（全件、正常、要覚、7日以内期限）を表示。クリックで `/projects` へ遷移。 |
| **クイックアクセス** | プラグイン状態 | 共通 | HotBiz, Slack, NotePM, Google Drive へのダイアログ/ナビゲーション。 |
| **最近閲覧した案件** | `GET /api/v1/dashboard` (`recent_projects`) | ユーザー | `recent_projects` DBレコードを取得し表示。0件時「最近閲覧した案件はありません」と表示。 |
| **重要なお知らせ** | `GET /api/v1/dashboard` (`notifications`) | ユーザー/会社 | `notifications` DBレコードを取得し表示。0件時「現在、重要なお知らせはありません」と表示。 |
| **タスク / ワークフロー** | `GET /api/v1/dashboard` (`tasks`) | ユーザー | `workflows` DBレコードを取得し表示。0件時「現在表示できるタスクはありません」と表示。 |
| **出勤状況** | 未接続 | 会社 | 「出勤管理システム連携準備中」と明確に表示。 |
| **今日の予定 (HotBiz)** | 未接続 | ユーザー | 「HotBiz予定表は連携準備中です」と明確に表示。 |
| **天気** | 未接続 | 地域 | 「天気情報は未接続です」と明確に表示。 |

---

## 変更対象ファイル

### バックエンド
1. **[NEW] [dashboard.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/schemas/dashboard.py)**: Pydantic レスポンススキーマ
2. **[NEW] [dashboard.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/api/routers/dashboard.py)**: 集約ダッシュボード API (`GET /api/v1/dashboard`)
3. **[MODIFY] [main.py](file:///d:/Antigravity/data/NAC%20HUB/backend/app/main.py)**: `/api/v1/dashboard` ルーター登録
4. **[NEW] [test_dashboard_api.py](file:///d:/Antigravity/data/NAC%20HUB/backend/test_dashboard_api.py)**: 自動テストスイート

### フロントエンド
1. **[NEW] [dashboard.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/types/dashboard.ts)**: TypeScript 型定義
2. **[NEW] [dashboard.ts](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/api/dashboard.ts)**: API クライアント関数 (`fetchDashboardData`)
3. **[MODIFY] [Home.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Home.tsx)**: 動的データ表示、未接続の明示化、なっくん入力連携、ローディング・エラー対応

---

## 検証計画
1. **バックエンドテスト**: `backend/test_dashboard_api.py`, `backend/test_projects_api.py`, `backend/test_api.py` 全パス
2. **型チェック & ビルド**: `npx tsc --noEmit` & `npm run build` (0エラー)
3. **ブラウザE2Eテスト**: ホーム画面表示、案件サマリー、閲覧履歴更新、削除クリーンアップ、ログアウトガード全動作確認
