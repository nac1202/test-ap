# テーマ調整計画: Teal -> Cyan

## ゴール
アプリケーションのメインカラーをTealからCyan（水色）に変更し、ユーザーの好みに合わせます。これには、主要な機能（ホーム、安否確認、避難所、マップ、ガイド）全体の背景色、テキスト色、境界線色、ホバー状態の更新が含まれます。また、必要に応じて標準的なGray/Slateから、より統一感のあるSlateベースのテキストシステムへ移行し、配色を現代的にします。

## ユーザーレビュー要
> [!NOTE]
> 破壊的な変更はありません。変更は視覚的なもののみです。

## 変更内容

### コアレイアウト
#### [変更] [Navbar.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/layout/Navbar.tsx)
- `bg-teal-600` -> `bg-cyan-600`
- `hover:bg-teal-700` -> `hover:bg-cyan-700`

#### [変更] [BottomNav.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/layout/BottomNav.tsx)
- アクティブ状態 `text-teal-600` -> `text-cyan-600`

### トップページ
#### [変更] [page.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/app/page.tsx)
- ヒーローセクション: `bg-teal-600` -> `bg-cyan-600`
- マップリンク: `text-teal-500` -> `text-cyan-500`, `bg-teal-50` -> `bg-cyan-50`

### 避難所 (Shelter) 機能
#### [変更] [shelter/page.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/app/shelter/page.tsx)
- ボタンとインタラクティブ要素をCyanテーマに変更。
- HTML構造の問題を修正。

#### [変更] [NearbyShelters.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/Shelter/NearbyShelters.tsx)
- 検索入力のフォーカスリング: `focus:ring-teal-500` -> `focus:ring-cyan-500`
- 検索ボタン: `bg-teal-600` -> `bg-cyan-600`

#### [変更] [ShelterForm.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/Shelter/ShelterForm.tsx)
- フォームコントロールと送信ボタンをCyanに変更。

#### [変更] [ShelterList.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/Shelter/ShelterList.tsx)
- アイコンとホバー効果をCyanに変更。

### 安否確認 (Safety) 機能
#### [変更] [safety/page.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/app/safety/page.tsx)
- テキスト色を `slate-800`/`slate-600` に更新。

#### [変更] [StatusForm.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/Safety/StatusForm.tsx)
- 送信ボタン: `bg-blue-600` -> `bg-cyan-600`
- フォーカスリング: `focus:ring-cyan-500`

### マップ (Map) 機能
#### [変更] [map/page.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/app/map/page.tsx)
- テキスト色を `slate-800`/`slate-600` に更新。

#### [変更] [LocationMap.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/Map/LocationMap.tsx)
- 現在地マーカーのピン色: `#0891b2` (Cyan-600)
- ローディング状態をテーマに合わせる。

### ガイド (Guide) 機能
#### [変更] [guide/page.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/app/guide/page.tsx)
- 検索入力のフォーカスリング: `focus:ring-cyan-500`

#### [変更] [GuideList.tsx](file:///d%3A/Antigravity/data/QQQ/family-safety-app/src/components/Guide/GuideList.tsx)
- タグとホバーヘッダーを適切なCyanバリエーションに変更。

## 検証計画

### 自動テスト
- `npm run lint` を実行し、構文エラーや未使用変数がないことを確認する。
- ビルドエラーがないことを確認する（リントで確認）。

### 手動検証
- **視覚チェック**: ブラウザでアプリケーションを開く。
- **ナビゲーション**: すべてのタブ（ホーム、安否確認、マップ、避難所、ガイド）をクリックして確認する。
- **インタラクション**:
    - ボタンをホバーする（より濃いCyanになるか確認）。
    - 入力欄をフォーカスする（Cyanのリングが表示されるか確認）。
    - ボトムナビのアクティブ状態を確認する。
- **一貫性**: 主要なアクションに "Teal" や "Blue"（標準）の要素が残っていないことを確認する。
