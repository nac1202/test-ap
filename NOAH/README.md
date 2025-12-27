# NOAH 空席表示 - シンプル実装

用途: 小さなスナック（カウンター約5席、ボックス約6席）の混雑状況を色で表示する簡易Webアプリ。

セットアップ:

1. Node.js（推奨 v16+）をインストール
2. このフォルダで依存関係をインストール:

```bash
npm install
```

起動:

```bash
# 任意で管理者ユーザーを設定
set ADMIN_USER=youruser
set ADMIN_PASS=yourpass
node server.js
```

デフォルト管理者: `admin` / `password`。

利用方法:
- 公開ページ: http://localhost:3000/  (色で現在の状態を表示)
- 管理画面: http://localhost:3000/admin  (Basic認証で保護、状態を更新)

備考:
- 実運用では HTTPS の導入、強いパスワード、セッション管理や CSRF 対策を検討してください。
