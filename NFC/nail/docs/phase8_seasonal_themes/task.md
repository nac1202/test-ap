# Phase 8: Seasonal Themes Implementation

## 概要
季節ごとのイベントに合わせた限定テーマを6種類追加する。

## 実装するテーマ
- [x] **Valentine** (Chocolate & Red/Gold)
- [x] **Sakura** (Spring / Cherry Blossom)
- [x] **Summer** (Ocean / Refreshing Blue)
- [x] **Halloween** (Orange & Purple)
- [x] **Christmas** (Red & Green / Holiday)
- [x] **New Year** (Red & White & Gold / Japanese Traditional)

## タスク
- [x] **定義ファイル更新** (`src/lib/themes.ts`)
    - [x] `ThemeType` に6つの新テーマを追加
    - [x] `THEMES` 配列に表示名と説明を追加

- [x] **スタイル設定** (`src/lib/theme-config.ts`)
    - [x] 各テーマの配色（bg, card, text, accent）を定義
    - [x] フォント選定

- [x] **装飾の実装** (`src/app/u/[handle]/page.tsx`)
    - [x] Valentine: ハート・チョコ
    - [x] Sakura: 桜吹雪アニメーション
    - [x] Summer: 海・泡アニメーション
    - [x] Halloween: ハロウィンカラー・アイコン
    - [x] Christmas: 雪の結晶
    - [x] New Year: 紅白・正月アイコン

- [x] **検証**
    - [x] プレビューでの確認
