# Phase 3 NFC管理機能強化 (Admin) タスクリスト

## 管理機能強化 (Admin)
- [x] タグ管理ページ (`src/app/admin/tags/page.tsx`) の改修
    - [x] ページネーションの実装
    - [x] キーワード検索機能の実装
    - [x] フィルタリング機能 (Status別) の実装
- [x] Server Actions (`src/actions/admin.ts` or `tag.ts`) の更新
    - [x] 検索・フィルタリング対応の `getTags` 関数の実装

## 書き込み支援機能 (iOS対応)
- [x] `src/components/admin/TagWriterHelp.tsx` の作成
    - [x] 有効化URLの生成と表示
    - [x] URLコピー機能 (`navigator.clipboard`)の実装
    - [x] iPhone用書き込み手順の表示
- [x] タグ管理ページへの `TagWriterHelp` 統合
    - [x] 各タグの行に「書き込み情報」ボタンを追加
    - [x] モーダル等での表示実装

## 検証
- [x] 管理画面での検索・フィルタ動作確認
- [x] iPhoneでのURLコピーと外部アプリ (NFC Tools) を使用した書き込み
- [x] 書き込んだタグの読み取りテスト (アプリ起動確認)
