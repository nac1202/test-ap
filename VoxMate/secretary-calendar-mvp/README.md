# Secretary Calendar MVP

スマホの音声入力（テキスト）からGoogleカレンダーを操作するための「秘書」アプリです。
仮予定の管理や、競合時の調整提案（仮予定を優先して動かす等）に特化しています。

## セットアップ手順

### 1. Google Cloud Console 設定
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、新しいプロジェクトを作成します。
2. **「APIとサービス」 > 「ライブラリ」** から **Google Calendar API** を検索して有効化します。
3. **「APIとサービス」 > 「OAuth同意画面」** を設定します。
   - User Type: External (テストユーザーに自分のGmailを追加)
   - Scope: `.../auth/calendar` を追加
4. **「APIとサービス」 > 「認証情報」** で以下を作成します。
   - **APIキー**: ブラウザ制限などは開発中はなしでOK。
   - **OAuth 2.0 クライアントID**: 
     - アプリケーションの種類: **ウェブアプリケーション**
     - 承認済みのJavaScript生成元: `http://localhost:5173` (Viteのポートに合わせて変更)
     - 承認済みのリダイレクトURI: `http://localhost:5173`

### 2. 環境変数
プロジェクトルートの `.env` ファイルを開き、上記で取得した値を設定してください。

```bash
VITE_GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=あなたのAPIキー
VITE_GOOGLE_SCOPES=https://www.googleapis.com/auth/calendar
```

### 3. ローカル実行
```bash
npm install
npm run dev
```

## 使い方
1. アプリを開き、Googleアカウントでログインします。
2. 画面下部の「+」ボタンで追加モードにします。
3. スマホのキーボードマイク等で「来週火曜の15時から田中さんと会議（仮）」のように入力し、「解析」を押します。
4. 解析結果を確認し、「確定して登録」または「仮で登録」を押します。
   - 「仮」で登録すると、通知は飛びませんが、他の予定と被った際に優先的に移動対象になります。
5. 予定が被った場合、CONFLICTS画面で「仮予定を移動」などの解決案が提示されます。

