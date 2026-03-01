# Phase 9: Admin Dashboard Implementation

## 概要
サロンスタッフが効率的に顧客管理とNFCタグ発行を行えるよう、`/admin` 以下の機能をダッシュボードとして再構築する。

## タスク
- [x] **設計 & 準備**
    - [x] `implementation_plan.md` 作成
    - [x] 現状の `/admin` ページ構成の確認

- [x] **Adminレイアウト実装**
    - [x] `src/app/admin/layout.tsx`: サイドバー/ヘッダー付きの管理画面レイアウト

- [x] **顧客一覧機能 (User List)**
    - [x] `src/app/admin/users/page.tsx`: 一覧画面
    - [x] 検索機能 (Display Name / Handle)
    - [x] `src/actions/admin.ts`: `getAdminUsers` 実装

- [x] **アクション機能**
    - [x] プロフィール確認へのリンク
    - [x] タグ管理機能 (`generateTags`, `updateTagStatus`) の復旧・統合

- [x] **検証**
    - [x] 一覧表示の確認（`user.profile.tags` のリレーション修正対応済み）
