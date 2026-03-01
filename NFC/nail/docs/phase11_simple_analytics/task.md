# Phase 11: 簡易アナリティクス (Simple Analytics)

「自分のプロフィールがどれくらい見られているか」を可視化し、ユーザーに「使われている実感」を提供します。

- [x] **Data Model & API**
    - [x] `schema.prisma` に `ProfileView` モデルを追加
    - [x] DBマイグレーション (`npx prisma db push`)
    - [x] 閲覧数を記録するAPI (`/api/analytics/view`) の作成

- [x] **Track Views**
    - [x] 公開プロフィール画面 (`/u/[handle]/page.tsx`) でクライアントサイドからAPIを呼び出し、1ビューとしてカウントする
    - [x] (Option) 同一セッション（またはlocalStorage）での連続リロードによる重複カウントを防ぐ仕組み

- [x] **Analytics Dashboard**
    - [x] ユーザー設定画面（`/settings` または新規 `/analytics`）に「最近1週間のアクセス数」などを表示するUIを作成
    - [x] `recharts` などのライブラリを用いて簡易的な折れ線グラフや棒グラフを描画する

- [x] **Verification**
    - [x] プロフィールへのアクセスが正しくDBに記録されるかテスト
    - [x] ダッシュボードでグラフが正しく表示されるかテスト
