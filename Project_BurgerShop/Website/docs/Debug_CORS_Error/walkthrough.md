# Chat API CORSエラー修正の確認

## 変更内容
外部サイト（Scrum Cubeなど）からこのAPI（Bun Bun Burger）を呼び出した際に発生していたCORS（Cross-Origin Resource Sharing）エラーを解消するため、`api/chat.js` を修正しました。

### 主な修正点
- `Access-Control-Allow-Origin: *` などのCORSヘッダーをレスポンスに追加しました。
- ブラウザが送信する事前確認リクエスト（OPTIONSメソッド）に対して、正しく `200 OK` を返す処理を追加しました。

## 検証手順

> [!IMPORTANT]
> この修正を有効にするには、**Vercelへのデプロイ**が必要です。Gitへのプッシュにより自動デプロイが行われる想定です。

1. **変更をデプロイする**
   以下のコマンドをターミナルで実行して、変更をGitHubにプッシュしてください：
   ```bash
   git add .
   git commit -m "Fix CORS: Add headers and OPTIONS handler"
   git push
   ```
   - これにより、Vercelへの自動デプロイが開始されます。
   - Vercelのダッシュボードでデプロイが完了したことを確認してください。

2. **ウィジェットの動作確認**
   - エラーが発生していたページ（`https://scrum-cube.com` など）を開きます。
   - チャットウィジェットを開き、何か話しかけてください。
   - エラーにならずに返答が返ってくれば修正成功です。

3. **コンソールログの確認**
   - ブラウザのF12キーを押して開発者ツールを開き、「Console」タブを確認します。
   - 赤字の `Access to fetch at ... blocked by CORS policy` エラーが表示されなくなっていることを確認してください。
