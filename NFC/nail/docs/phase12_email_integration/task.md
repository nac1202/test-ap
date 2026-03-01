# Phase 12: 本番用メール配信機能 (Production Email Integration)

ログイン画面で、ユーザーの実際のメールアドレスにワンタイムパスワード (OTP) を送信する機能を実装します。

- [x] **Setup & Packages**
    - [x] `resend`, `@react-email/components`, `@react-email/render` のインストール
    - [x] `.env` に `RESEND_API_KEY` を設定 (User Review)

- [x] **Email Templates**
    - [x] `src/emails/VerificationEmail.tsx` の作成 (React Email)
    - [x] デザインの調整（ロゴ、OTP表示部分）

- [x] **Auth Action Update**
    - [x] `src/actions/auth.ts` の `sendOtp` を更新
    - [x] Resend API を呼び出してHTMLメールを送信する処理の実装

- [x] **Verification**
    - [x] 実際にメールが届き、そのコードでログインできるかテスト
