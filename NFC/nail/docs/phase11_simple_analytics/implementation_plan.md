# Phase 11: 簡易アナリティクス (Simple Analytics) 実装計画

## 目標
ユーザーが「自分のプロフィールがどれくらい見られているか」を確認できる簡易的なアナリティクス機能を追加します。プロフィール画面へのアクセスログ（View）を記録し、ユーザー管理画面でグラフとして可視化します。

## User Review Required
> [!IMPORTANT]
> **ダッシュボードの配置について**
> 閲覧数グラフは、現在の `/settings`（プロフィール設定画面）の下部に追記する形でよろしいでしょうか？
> それとも、独立した `/analytics` などの別ページを作成する方がよろしいでしょうか？
> *（本計画では、実装のシンプルさを考慮し `/settings` の下部に追加する前提としています）*

## Proposed Changes

### Database
#### [MODIFY] [schema.prisma](file:///d:/Antigravity/data/NFC/nail/prisma/schema.prisma)
- `ProfileView` モデルを追加します。
  - `id` (String)
  - `profileId` (String): 紐づくプロフィールのID
  - `createdAt` (DateTime): 閲覧日時
  ※ 個人を特定せず、単なるアクセス数のカウントとして記録します。

### Backend API
#### [NEW] `src/app/api/analytics/view/route.ts`
- プロフィール閲覧時にコールされるAPIエンドポイント。
- `handle` を受け取り、該当プロフィールの `ProfileView` レコードを1件追加します。

### Frontend (Tracking)
#### [MODIFY] [src/app/u/[handle]/page.tsx](file:///d:/Antigravity/data/NFC/nail/src/app/u/[handle]/page.tsx)
- クライアントサイドコンポーネント（または軽量な `useEffect` 用コンポーネント）を追加し、ページマウント時に `/api/analytics/view` を叩く処理を実装します。
- ※SSRの邪魔にならないよう、クライアント側からの非同期リクエストとして処理します。

### Frontend (Dashboard)
#### [MODIFY] [src/app/settings/page.tsx](file:///d:/Antigravity/data/NFC/nail/src/app/settings/page.tsx)
- データベースから過去1週間（または30日）の日別アクセス数を集計して取得します。
- `recharts`（またはChart.js）を導入し、アクセス数の推移をシンプルな折れ線グラフまたは棒グラフで表示するコンポーネントを追加します。
- *必要に応じて `npm install recharts` を実行します。*

## Verification Plan

### Automated Tests
- 今回は対象外とします。

### Manual Verification
1.  **データ記録の確認**: ブラウザで `/u/test` などの公開プロフィールにアクセスし、DB (`ProfileView` テーブル) にレコードが追加されることを確認する。
2.  **グラフ表示の確認**: ログインして `/settings` にアクセスし、日別のアクセス数がグラフとして正しく描画されていることを確認する。
