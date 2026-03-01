# Phase 12: 本番用メール配信機能 (Production Email Integration) 実装計画

## 目標
現在、ログイン時の認証コード(OTP)がコンソールに出力されるだけの仮実装となっている部分を改修し、実際にユーザーのメールアドレスへ認証コードが届くようにします。
本プロジェクトでは、開発体験と信頼性の高いメール配信サービスである **Resend** と、Reactベースでメールテンプレートを作成できる **React Email** を使用します。

## User Review Required
> [!IMPORTANT]
> **外部サービスの事前準備について**
> 実際にメールを送信するためには、「Resend」のアカウントとAPIキーが必要です。
> 実装を進める前に、または実装と並行して、以下のご準備をお願いできますでしょうか？
> 
> 1. [Resend](https://resend.com/) にサインアップ
> 2. API Key を発行
> 3. アプリケーションの `.env` ファイルに `RESEND_API_KEY=re_...` を追記
> 4. （必要に応じて）ご自身のドメインの認証（本番公開時）

## Proposed Changes

### パッケージの追加
- `resend` (Resend公式SDK)
- `@react-email/components`, `@react-email/render` (メールテンプレート作成用)

### メールテンプレートの作成
#### [NEW] `src/emails/VerificationEmail.tsx`
- ログイン時に入力されたメールアドレス宛に届く、HTMLメールのテンプレートを作成します。
- Nail Linkのデザインに合わせたシンプルで洗練されたデザイン（ロゴ、6桁のコード、有効期限など）をReactコンポーネントで実装します。

### 認証ロジックの修正
#### [MODIFY] [src/actions/auth.ts](file:///d:/Antigravity/data/NFC/nail/src/actions/auth.ts)
- 既存の `sendOtp` 関数内にある仮実装（`console.log` で出力している部分）を削除します。
- `Resend` クライアントを初期化し、`react-email` でレンダリングしたHTMLメールを実際に送信する処理に書き換えます。

### 環境変数の設定
#### [MODIFY] `.env` 
- 以下のような環境変数を追加（ユーザー側の作業が必要）
  ```env
  RESEND_API_KEY="re_..."
  EMAIL_FROM="Nail Link <noreply@yourdomain.com>"
  ```

## Verification Plan

### Manual Verification
1. ローカルサーバーを起動し、ログイン画面 (`/login`) を開く。
2. テスト用（あるいはご自身の受信可能な）メールアドレスを入力し、「認証コードを送信」をクリックする。
3. 数秒以内に実際のメールボックスに認証コードが記載された美しいHTMLメールが届くことを確認する。
4. 届いたコードを使って、正しくログインできることを確認する。
