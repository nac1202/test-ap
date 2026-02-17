# Implementation Plan - Fix CORS Error in Chat API

AIコンシェルジュが外部サイト（`scrum-cube.com`）から正常に動作するように、APIサーバー（`bunbun-burger.vercel.app`）のCORS設定を修正します。

## ユーザーレビューが必要な事項

> [!IMPORTANT]
> この変更はセキュリティ設定（CORS）に関わります。現在は `*`（すべてのドメイン）からのアクセスを許可する設定にしますが、特定のドメインのみに制限したい場合はご連絡ください。

## 提案される変更

### Backend (API)

#### [MODIFY] [chat.js](file:///d:/Antigravity/data/Project_BurgerShop/Website/api/chat.js)
- `OPTIONS` メソッドのリクエスト（プリフライトリクエスト）に対して、`200 OK` と適切なCORSヘッダーを返す処理を追加します。
- `POST` リクエスト（およびその他のレスポンス）にもCORSヘッダーが付与されるように修正します。

## 検証計画

### 自動テスト
- ローカル環境ではAPIの動作を完全には再現できないため（Vercel Serverless Functionを使用しているため）、本番環境へのデプロイが必要です。

### 手動検証
1. **変更を適用し、Vercelへデプロイしてください。**
2. **検証手順:**
   - 外部サイト（`scrum-cube.com` またはウィジェットを設置したページ）を開きます。
   - チャットウィジェットを開き、メッセージを送信します。
   - ブラウザの開発者ツール（F12）の「Console」タブを確認し、CORSエラー（赤色のエラーメッセージ）が消えていることを確認します。
   - 「Network」タブで `chat` エンドポイントへのリクエストが成功（Status 200）していることを確認します。
