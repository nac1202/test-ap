# Tealテーマ拡張 実装計画

## 目標
メインページで確立した「Teal & Slate」テーマを、アプリの残りのセクション（安否確認、マップ、ガイド詳細）にも適用し、アプリ全体で一貫したプレミアムなユーザー体験を提供します。

## ユーザーレビュー
大きな破壊的変更はありません。表示スタイルの更新のみです。

## 変更内容

### 安否確認機能 (`/safety`)
#### [MODIFY] [page.tsx](file:///d:/Antigravity/data/QQQ/family-safety-app/src/app/safety/page.tsx)
- ヘッダーのテキスト色を `text-slate-800` に更新。
- 説明テキストを `text-slate-600` に更新。

#### [MODIFY] [StatusForm.tsx](file:///d:/Antigravity/data/QQQ/family-safety-app/src/components/Safety/StatusForm.tsx)
- コンテナのスタイル変更: `rounded-xl`, `border-slate-100`, `shadow-sm`。
- 入力フォームのフォーカスリングを `teal-500` に更新。
- "無事"ボタンを緑/Teal系に調整（意味を保ちつつスタイルを統一）。
- "送信"ボタンを `bg-teal-600` にし、他のアクションボタンと統一。

### マップ機能 (`/map`)
#### [MODIFY] [page.tsx](file:///d:/Antigravity/data/QQQ/family-safety-app/src/app/map/page.tsx)
- ヘッダーコンテナを `backdrop-blur`（スティッキー時）または `border-slate-200` 付きの白背景に更新。
- テキスト色を Slate テーマに更新。

#### [MODIFY] [LocationMap.tsx](file:///d:/Antigravity/data/QQQ/family-safety-app/src/components/Map/LocationMap.tsx)
- コンテナの枠線/影を新しいカードデザイン（`rounded-xl`, `border-slate-200`, `shadow-lg`）に合わせる。
- "APIキーなし"のエラーステートをより洗練された表示（Slate背景、角丸）に変更。

### ガイド機能
#### [MODIFY] [page.tsx](file:///d:/Antigravity/data/QQQ/family-safety-app/src/app/firstaid/page.tsx) & [page.tsx](file:///d:/Antigravity/data/QQQ/family-safety-app/src/app/security/page.tsx)
- ヘッダーが `text-slate-800` を使用しているか確認。
- 手動で配置されているアイコンがあれば、コンテナスタイルを統一。

## 検証計画
### 手動検証
- `/safety` にアクセスし、フォームの操作とボタンの状態を確認。
- `/map` にアクセスし、マップコンテナのスタイルを確認。
- `/firstaid` と `/security` にアクセスし、ヘッダーの一貫性を確認。
