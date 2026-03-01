# Phase 13: 本番環境へのデプロイガイド (Deployment Guide)

Nail Link をオンラインで実際に動作させるための本番環境デプロイメント計画です。
Next.js アプリケーションのデプロイには、一番相性が良く設定が簡単な **Vercel** を推奨します。

## 課題：本番環境でのデータベース (SQLiteの制限)
現在、開発環境では `SQLite` を使用してローカルファイルにデータを保存しています。
しかし、Vercelなどのサーバーレス環境では、ファイルシステムが一時的なもの（デプロイのたびにリセットされる）であるため、**SQLiteをそのまま本番で使うとデータが消えてしまいます。**

そのため、本番環境用に **クラウド上のデータベース（PostgreSQLなど）** を用意する必要があります。一番簡単で無料枠が充実している **Supabase** の利用を推奨します。

---

## デプロイ手順 (推奨: Vercel + Supabase)

### Step 1: データベースのセットアップ (Supabase)
1. [Supabase](https://supabase.com/) にアクセスし、アカウントを作成・ログインします。
2. 「New Project」を作成します。
3. プロジェクト作成後、`Project Settings` > `Database` から **Connection String (URI)** をコピーします。
   （※ コピーしたURIのパスワード部分 `[YOUR-PASSWORD]` は、プロジェクト作成時に設定したパスワードに置き換えます）

### Step 2: Prisma のプロバイダー変更 (コード修正)
`prisma/schema.prisma` を以下のように書き換えて、SQLiteからPostgreSQLへ変更します。

```prisma
datasource db {
  provider = "postgresql" // "sqlite" から変更
  url      = env("DATABASE_URL")
}
```
※これにより、既存のマイグレーション履歴がリセットされるため、`prisma/migrations` フォルダを一度削除し、`npx prisma migrate dev --name init` を再実行する必要があります。（この作業はAIアシスタント側で実行可能です）

### Step 3: Vercel へのデプロイ
1. [Vercel](https://vercel.com/) にアクセスし、GitHubアカウントでログインします。
2. 「Add New...」>「Project」から、GitHub上の `nail` リポジトリをインポートします。
3. **Environment Variables (環境変数)** の設定画面で、以下の変数をすべて追加します。

| 変数名 | 値の例 | 説明 |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@.../postgres` | Step 1で取得したSupabaseの接続URL |
| `NEXTAUTH_URL` | `https://あなたのVercelドメイン.vercel.app` | Vercelが発行する本番用URL |
| `AUTH_SECRET` | `(ランダムな文字列)` | `npx auth secret`、または `openssl rand -base64 32` で生成した文字列 |
| `RESEND_API_KEY` | `re_...` | 取得済みのResend APIキー |
| `EMAIL_FROM` | `Nail Link <onboarding@resend.dev>` | 取得済みの送信元メールアドレス |
| `NEXT_PUBLIC_BASE_URL` | `https://あなたのVercelドメイン.vercel.app` | アプリの公開URL |

4. **「Deploy」** ボタンをクリックします。

### Step 4: 本番データベースの初期化
デプロイが成功しても、本番データベースにはまだテーブルがありません。
Vercelのダッシュボードから、デプロイメントのビルド設定(Build Command)を変更するか、ローカル環境から本番データベースに向けてマイグレーションを実行する必要があります。
- おすすめの方法：ローカルの `.env` の `DATABASE_URL` を一時的に Supabase のものに書き換え、`npx prisma db push` を実行してテーブルを作成します。

---

## ユーザーへの確認事項
上記の手順でデプロイを進めるにあたり、以下のご判断をお願いいたします。

1. **データベースの移行について**: Vercelでの公開に向けて、**Supabase (PostgreSQL)** に移行する形で進めてよろしいでしょうか？（もし他のサービス、例えば Render などをご希望の場合はお知らせください）
2. **アカウントの準備**: ご自身で Supabase と Vercel のアカウント作成およびプロジェクト設定を行っていただく必要があります。

よろしければ、**Step 2 (PrismaのPosgreSQL変更とマイグレーションのリセット)** をこちらで実行し、コミット・プッシュいたします。
ご準備ができましたら「準備できたのでPosgreSQLに変更して」とお知らせください！
