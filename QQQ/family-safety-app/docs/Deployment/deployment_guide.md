# Family Safety App デプロイガイド (Vercel)

このアプリを Vercel にデプロイする手順です。

## 1. 事前準備
- GitHub アカウント
- Vercel アカウント
- Google Maps API Key

## 2. デプロイ手順

1.  **GitHubへプッシュ**: 最新のコードを GitHub リポジトリにプッシュします。
2.  **Vercelでプロジェクトを作成**:
    - Vercel ダッシュボードで "Add New..." -> "Project" を選択。
    - GitHub リポジトリをインポートします。
3.  **設定 (Configure Project)**:
    - **Framework Preset**: `Next.js` (自動検出されるはずです)
    - **Environment Variables**:
      - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: 取得済みの Google Maps API Key を入力してください。
4.  **Deploy**: "Deploy" ボタンをクリックします。

## 3. 注意点 (PWAについて)
現在のバージョンでは、ビルドエラー回避のため **PWA (Progressive Web App) 機能は一時的に無効化** されています。
通常のWebアプリとしては問題なく動作し、スマートフォンでもブラウザから利用可能です。
PWA機能（インストール機能など）が必要な場合は、別途ビルド設定の調整が必要です。

## 4. 動作確認
デプロイ完了後、提供された URL にアクセスし、以下の動作を確認してください。
- マップが表示されるか (API Key が正しいか)
- ページ遷移がスムーズか
- テーマカラーが Cyan になっているか

以上です。
