# タスク: テーマカラーの調整 (Teal -> Cyan)

- [x] **プロジェクトのセットアップと分析**
  - [x] コードベースを分析し、"Teal"カラーの使用箇所を特定する。
  - [x] テーマ移行のための実装計画を作成する。

- [x] **テーマ移行: コアコンポーネント**
  - [x] `Navbar.tsx`の更新 (背景色、ホバー色)
  - [x] `BottomNav.tsx`の更新 (アクティブアイコンの色)
  - [x] `src/app/page.tsx`の更新 (ヒーローセクション、リンクアイコン/テキスト)

- [x] **テーマ移行: 避難所 (Shelter) 機能**
  - [x] `src/app/shelter/page.tsx`の更新 (ボタン、見出し)
  - [x] `ShelterForm.tsx`の更新 (入力フォーカス、周辺要素)
  - [x] `ShelterList.tsx`の更新 (アイコン、空の状態)
  - [x] `NearbyShelters.tsx`の更新 (検索入力、ボタン、ステータステキスト)
  - [x] Shelterコンポーネントの構文エラーとインポート問題の修正

- [x] **テーマ移行: 安否確認 (Safety) 機能**
  - [x] `src/app/safety/page.tsx`の更新 (テキスト色 - GrayからSlateへ)
  - [x] `StatusForm.tsx`の更新 (ボタン、フォーカスリング、送信ボタン)

- [x] **テーマ移行: マップ (Map) 機能**
  - [x] `src/app/map/page.tsx`の更新 (テキスト色 - GrayからSlateへ)
  - [x] `LocationMap.tsx`の更新 (マーカー色、ローディング状態)

- [x] **テーマ移行: ガイド (Guide) 機能**
  - [x] `src/app/guide/page.tsx`の更新 (テキスト色、見出し、検索機能の追加)
  - [x] `GuideList.tsx`の更新 (カテゴリータグ、アイコン、ホバー効果)

- [x] **品質保証と検証**
  - [x] 変更された全ファイルのリントエラーを解消する。
  - [x] ビルドと機能の検証 (手動レビュー)。

# タスク: ガイドナビゲーションの改善

- [x] **ナビゲーションコンポーネントの作成**
  - [x] `src/components/Guide/GuideTabs.tsx` を作成する (3つのガイドへのリンク)。

- [x] **各ガイドページへの統合**
  - [x] `src/app/guide/page.tsx` (防災ガイド) にタブを追加。
  - [x] `src/app/firstaid/page.tsx` (救護ガイド) にタブを追加。
  - [x] `src/app/security/page.tsx` (防犯・護身ガイド) にタブを追加。

# タスク: ホーム画面のガイドボタン統合

- [x] **ボタンの統合とリデザイン**
  - [x] `src/app/page.tsx` を修正し、3つのガイドボタンを1つの「あんしんガイド」ボタンに統合する。
  - [x] 説明文を「防災、救護、防犯情報をまとめて確認」などに変更する。

# タスク: ボトムナビゲーションのラベル変更

- [x] **ラベルの更新**
  - [x] `src/components/layout/BottomNav.tsx` の「ガイド」を「安心ガイド」に変更する。
