# Phase 7: Premium Theme Implementation (Hermès Style)

## 概要
ユーザーからの要望を受け、公開プロフィールページ (`/u/[handle]`) に「エルメスのような高級感」と「段階的な色使い（トーン・オン・トーン）」を取り入れたプレミアムテーマを追加する。

## タスク
- [x] **設計 & 計画**
    - [x] `implementation_plan.md` の作成と承認
    - [x] 既存テーマ実装のリファクタリング

- [x] **リファクタリング**
    - [x] `src/lib/theme-config.ts` 作成
    - [x] `page.tsx` の改修

- [x] **新テーマ実装 & ブラッシュアップ**
    - [x] **Sage (Green)**: 自然なセージグリーン (New)
        - [x] Orangeテーマから差し替え
        - [x] カラーパレット作成 (Sage White / Deep Sage)
        - [x] 装飾: 葉のモチーフ
    - [x] **Etoupe (Greige)**: 実装済み
    - [x] **Marine (Navy)**: 実装済み（透かし削除）
    - [x] **ELEGANT & POP**: デザイン刷新済み
    - [x] **DARK**: 削除済み

- [x] **検証**
    - [x] デザイン確認 (ユーザー承認済み)
    - [x] プロフィール編集画面 (`ProfileForm`) へのテーマ選択実装
    - [x] 公開ページでの表示確認 (`z-index` 調整済み)
