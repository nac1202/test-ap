# Phase 2 画像アップロード機能 タスクリスト

## バックエンド & 設定
- [x] Cloudinary パッケージのインストール
- [x] Prisma スキーマの更新 (`avatarUrl` 追加)
- [x] Cloudinary 環境変数の設定
- [x] Server Action 実装: `getCloudinarySignature` (`src/actions/upload.ts`)
- [x] Server Action 実装: `updateProfile` (`src/actions/profile.ts`, `avatarUrl` 対応済み)

## フロントエンド実装
- [x] `ProfileForm` コンポーネントの作成
    - [x] 画像アップロード用インプットの追加
    - [x] プレビュー機能の実装
    - [x] Cloudinary へのクライアントサイドアップロードロジックの実装
    - [x] `updateProfile` への `avatarUrl` 送信処理
- [x] プロフィール設定ページ (`src/app/settings/page.tsx` 等) の作成・整備
    - [x] ページの作成 (もし存在しなければ)
    - [x] `ProfileForm` の配置

## 検証
- [x] Cloudinary への画像アップロード確認
- [x] データベース更新確認 (`avatarUrl`)
- [x] プロフィールページでの表示確認 (`/u/[handle]`)
