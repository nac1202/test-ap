# Phase 13: 本番環境へのデプロイガイド (Deployment Guide)

Nail Link をオンラインで実際に動作させるための本番環境デプロイメントのタスク一覧です。
VercelとSupabaseを使用してデプロイを行うためのステップになります。

- [x] **Database Setup (User Action)**
    - [x] Supabaseアカウント作成と新規プロジェクト作成
    - [x] `DATABASE_URL` (Connection String) の取得

- [x] **Prisma Migration (`PostgreSQL` への変更)**
    - [x] `schema.prisma` のプロバイダーを `postgresql` に変更
    - [x] 既存の `prisma/migrations` フォルダを削除し履歴をリセット
    - [x] 新規マイグレーションを作成 (`npx prisma migrate dev --name init`)

- [ ] **Vercel Deployment (User Action)**
    - [ ] Vercelアカウント作成とGitHubリポジトリの連携
    - [ ] `Environment Variables` (環境変数) の設定
        - `DATABASE_URL`
        - `NEXTAUTH_URL`
        - `AUTH_SECRET`
        - `RESEND_API_KEY`
        - `EMAIL_FROM`
        - `NEXT_PUBLIC_BASE_URL`
    - [ ] デプロイの実行

- [ ] **Database Initialization**
    - [ ] 本番用のSupabaseデータベースに対してテーブルを作成 (`npx prisma db push` または `migrate deploy`)

- [ ] **Verification**
    - [ ] 本番環境のURL (Vercel発行のドメイン) にアクセスして動作確認
    - [ ] 実際のメールアドレスを利用して本番環境からログインできるか確認
    - [ ] プロフィールページの自動アナリティクス機能が動作するか確認
