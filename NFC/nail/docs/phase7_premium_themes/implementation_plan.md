# Implementation Plan: Premium Themes (Hermès Style)

## Goal
公開プロフィールページに、エルメスのような高級感のある配色と、レイヤー感のあるデザインテーマを追加する。
また、テーマの実装を `page.tsx` から分離し、保守性を高める。

## User Review Required
*   **新テーマの配色案**: 以下の3つの新テーマを追加します。イメージに近いか確認をお願いします。

## Proposed Changes

### 1. Refactoring Theme System
現在 `src/app/u/[handle]/page.tsx` にハードコードされているスタイル定義を切り出し、拡張可能な構成にします。

#### [NEW] `src/lib/theme-config.ts`
テーマごとの詳細なスタイル定義（背景、テキスト、アクセント、ボーダー、シャドウなど）をここに集約します。
単なる色指定だけでなく、`background-image` (gradient) や `box-shadow` の複雑な設定も可能な構造にします。

```typescript
export const THEME_CONFIG = {
  // Existing ...
  STANDARD: { ... },
  
  // New Luxury Collections
  LUXURY_ORANGE: {
    label: "Faubourg (Orange)",
    bg: "bg-[#F3F0E9]", // 優しいクリーム色
    accent: "text-[#D35400]", // エルメス風オレンジ
    card: "bg-white border-t-4 border-[#D35400] shadow-sm", // トップにアクセントカラー
    button: "bg-white border border-[#D35400] text-[#D35400] hover:bg-[#FFF5F0]",
    font: "font-serif"
  },
  LUXURY_GREIGE: {
    label: "Etoupe (Greige)",
    bg: "bg-[#E6E3DD]", // エトゥープ風のグレージュ
    accent: "text-[#5D5752]", // 濃いグレージュ
    card: "bg-[#FAFAFA] border border-[#D8D4CE]",
    // ステッチのような破線ボーダーを取り入れるなどの工夫
    button: "bg-transparent border border-[#5D5752] text-[#5D5752] hover:bg-white", 
    font: "font-sans"
  },
  LUXURY_NAVY: {
    label: "Marine (Navy)",
    bg: "bg-[#1A2530]", // 深いネイビー
    accent: "text-[#AAB7C4]", // 淡いブルーグレー
    card: "bg-[#2C3E50] border-l-4 border-[#F1C40F]", // ネイビー×ゴールド
    text: "text-white",
    font: "font-serif"
  }
}
```

### 2. Update Database Schema
*   (変更なし) `Profile` モデルの `theme` カラムは既に String なので、新しいID文字列 (`LUXURY_ORANGE` 等) を保存するだけで対応可能です。

### 3. Update Components

#### [MODIFY] `src/lib/themes.ts`
*   新しいテーマIDとラベル、プレビュー用の代表色を追加定義します。

#### [MODIFY] `src/app/u/[handle]/page.tsx`
*   `themeStyles` 定義を削除し、`src/lib/theme-config.ts` をインポートして使用するように変更します。
*   よりリッチな表現（グラデーション背景や、カードの装飾）に対応できるよう、JSX構造を微調整します。

#### [MODIFY] `src/app/app/profile/ProfileForm.tsx`
*   テーマ選択肢が増えるため、テーマ選択UIを少し整理します（「Standard」「Premium」などでカテゴリ分けするか、グリッドを調整）。

## Verification Plan

### Manual Verification
1.  **管理画面**: ProfileFormで新テーマを選択し、プレビューの色が変わることを確認。
2.  **公開ページ**: `/u/[handle]` にアクセスし、新テーマ（特にOrangeとGreige）がエルメスのような質感に見えるか確認。
    *   フォントの雰囲気
    *   ボタンのホバーエフェクト
    *   全体の余白感
