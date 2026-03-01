# Phase 8: Seasonal Themes Implementation Plan

## Goal
季節イベントに合わせた6つのプレミアムテーマを追加し、ユーザーがシーズンごとにプロフィールを楽しく着せ替えられるようにする。

## Proposed Changes

### 1. `src/lib/themes.ts`
新しいテーマ定義を追加。

```typescript
export type ThemeType = ... | 'VALENTINE' | 'SAKURA' | 'SUMMER' | 'HALLOWEEN' | 'CHRISTMAS' | 'NEW_YEAR'
```

### 2. `src/lib/theme-config.ts`
各テーマのデザイン定義。

#### Theme Concepts
1.  **VALENTINE**
    *   **Colors**: BG `Soft Pink/Red`, Card `Chocolate`, Text `Gold/White`
    *   **Decoration**: ハートの散りばめ or チョコレートが垂れている表現

2.  **SAKURA**
    *   **Colors**: BG `Pale Pink`, Card `White/Translucent`, Text `Sakura Pink`
    *   **Decoration**: 舞い散る桜の花びら

3.  **SUMMER**
    *   **Colors**: BG `Ocean Blue Gradient`, Card `White/Glass`, Text `Deep Blue`
    *   **Decoration**: 水面（波紋）のエフェクト or 太陽のフレア

4.  **HALLOWEEN**
    *   **Colors**: BG `Deep Purple`, Card `Black`, Text `Orange`
    *   **Decoration**: クモの巣、オバケのシルエット

5.  **CHRISTMAS**
    *   **Colors**: BG `Deep Red`, Card `Dark Green/White`, Text `Gold`
    *   **Decoration**: 雪の結晶、イルミネーション

6.  **NEW_YEAR**
    *   **Colors**: BG `Red/White`, Card `Gold`, Text `Black`
    *   **Decoration**: 水引、梅の花

### 3. `src/app/u/[handle]/page.tsx`
`style.customDecoration` に応じた装飾コンポーネントの追加。
CSSグラデーションやSVGアイコン（EmojiやシンプルなCSSシェイプ）を活用して軽量に実装する。

## Verification Plan
1.  `npm run dev` でローカルサーバー起動
2.  `/app/profile` (設定画面) で各テーマを選択し、プレビューが正常か確認
3.  `/u/[handle]` (公開ページ) で実際に適用されているか確認
