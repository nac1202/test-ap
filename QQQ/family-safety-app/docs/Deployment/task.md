# タスク: Vercelへのデプロイ準備

このドキュメントでは、Family Safety App を Vercel にデプロイするための準備と検証プロセスを追跡します。

- [x] **ビルド検証**
  - [x] `npm run build` を実行し、エラーがないことを確認する (ただしPWAは一時的に無効化)。
  - [x] `npm run start` でプロダクションビルドの動作確認を行う。

- [x] **設定確認**
  - [x] `next.config.ts` (または .js) の設定確認 (PWA設定など)。
  - [ ] `package.json` のスクリプト確認。
  - [ ] 環境変数の確認 (`.env.local` vs Vercel Environment Variables)。

- [x] **デプロイ手順のドキュメント化**
  - [x] ユーザー向けのデプロイ手順書 (`docs/Deployment/deployment_guide.md`) を作成する。
