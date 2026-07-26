# [追加開発フェーズ5] スマホ・タブレット対応（レスポンシブ最適化） 実装計画

NAC HUB の全14画面および共通レイアウト・共通UIコンポーネントを、モバイル（320px～430px）、タブレット（768px～1024px）、PC（1280px以上）で快適かつシームレスに操作できるようにレスポンシブWeb最適化を行います。

---

## レスポンシブ監査・問題点一覧

| 対象 | 現状の問題点 | 対応策 |
|---|---|---|
| **共通レイアウト** | スマホ幅で固定サイドバーが画面を占有・隠蔽する | デスクトップ表示（`lg:flex`）を維持しつつ、モバイル用ハンバーガーボタン＋ドロワー（背景オーバーレイ、スクロール抑制、Escapeキー/オーバーレイクリックで閉じる、`aria-expanded` 付与）を新設 |
| **ヘッダー & バナー** | スマホで検索バー、管理者バナー、ユーザー表示が潰れる | ハンバーガーボタン配置、検索バーのレスポンシブ幅化、ユーザー名のモバイル非表示化（イニシャルアイコンのみ表示） |
| **Input / Button** | `text-sm` (14px) により iOS でフォーカス時自動ズームが発生。タッチ領域が小さい | 入力欄を `text-base md:text-sm` (16px) に設定して自動ズームを防止。ボタンのタッチ領域を最低 44px 確保 |
| **Modal** | スマホ幅でコンテンツが溢れ、スクロールできない | `w-[95%] sm:w-full max-w-lg max-h-[90dvh] flex flex-col overflow-y-auto` に最適化。タッチしやすい閉じるボタンを配置 |
| **Table** | 横幅オーバー時にページ全体の横スクロールが発生する | `Table` コンポーネントを `overflow-x-auto min-w-full` コンテナ化し、ページ外へのはみ出しを防止 |
| **1. /login** | `100vh` によりモバイルブラウザのアドレスバー表示時にスクロールが発生 | `min-h-[100dvh]` を採用し、入力欄 16px 化・全幅ボタン化で快適操作を実現 |
| **2. /change-password** | ポリシー説明とフォームがスマホで圧迫される | 1列レイアウト化、16px 入力欄、100dvh スクロール対応 |
| **3. /** (Home.tsx) | ウィジェットグリッドがスマホで固定数化して崩れる | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` へ可変グリッド化。文字の折り返し（`break-words`）対応 |
| **4. /chat** (Chat.tsx) | モバイルキーボード表示時に入力欄が隠れる・吹き出し幅固定 | 画面全体を `100dvh` にし、メッセージ領域のみスクロール。入力欄を `sticky/fixed bottom-0` 化 |
| **5. /projects** | 検索・ステータス・プロデューサーの3フィルターがスマホで溢れる | モバイルで1列縦並び（`flex-col md:flex-row`）化。案件カードリストを画面幅にレスポンシブ追従 |
| **6. /projects/:id** | 案件名と操作ボタンがスマホで衝突する | ヘッダーの1列化・ボタン縦並び/折り返し、タイムライン・基本情報のレスポンシブ化 |
| **7. /notices, /notifications** | 長い件名や状態タグがスマホで重なる | 1列カード化、テキスト折り返し、タッチターゲット確保 |
| **8. /hotbiz** | リンクカードがスマホで押しにくい | `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` へレスポンシブ可変 |
| **9-14. 各設定画面** | テーブルやカードがスマホではみ出す | モバイル用カード表示・スクロールコンテナ化・フォーム1列化 |

---

## 変更対象ファイル一覧

### 共通コンポーネント
1. **[MODIFY] [index.html](file:///d:/Antigravity/data/NAC%20HUB/frontend/index.html)**: Viewport に `viewport-fit=cover` を追加
2. **[MODIFY] [Input.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/ui/Input.tsx)**: 16px フォント・高さ調整（iOSズーム防止）
3. **[MODIFY] [Button.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/ui/Button.tsx)**: タッチ領域拡大（min 44px）
4. **[MODIFY] [Modal.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/ui/Modal.tsx)**: 100dvh / 90dvh スクロール領域化
5. **[MODIFY] [Table.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/ui/Table.tsx)**: スクロールコンテナ化
6. **[MODIFY] [MockLayout.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/layout/MockLayout.tsx)**: ハンバーガーメニュー、ドロワー開閉、オーバーレイ、スクロール制御
7. **[MODIFY] [Sidebar.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/components/layout/Sidebar.tsx)**: モバイルドロワー対応・リンククリック後自動閉じ対応

### 全14画面
8. **[MODIFY] [Login.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Login.tsx)**: 100dvh・キーボードスクロール対応
9. **[MODIFY] [ChangePassword.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/ChangePassword.tsx)**: レスポンシブフォーム化
10. **[MODIFY] [Home.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Home.tsx)**: 可変グリッド、100dvhなっくんヒーロー、文字折り返し
11. **[MODIFY] [Chat.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Chat.tsx)**: 100dvh・モバイルキーボード固定入力欄
12. **[MODIFY] [Projects.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Projects.tsx)**: フィルター1列化・カード表示化
13. **[MODIFY] [ProjectDetail.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/ProjectDetail.tsx)**: ヘッダー/タイムライン/基本情報レスポンシブ化
14. **[MODIFY] [Notices.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Notices.tsx)**: レスポンシブカード化
15. **[MODIFY] [Notifications.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/Notifications.tsx)**: レスポンシブカード化
16. **[MODIFY] [HotBiz.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/HotBiz.tsx)**: 1列カード化
17. **[MODIFY] [Users.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/Users.tsx)**: テーブルスクロール・レスポンシブ化
18. **[MODIFY] [Roles.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/Roles.tsx)**: テーブルスクロール・レスポンシブ化
19. **[MODIFY] [System.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/System.tsx)**: フォーム1列化
20. **[MODIFY] [Plugins.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/Plugins.tsx)**: カード可変グリッド化
21. **[MODIFY] [Audit.tsx](file:///d:/Antigravity/data/NAC%20HUB/frontend/src/pages/settings/Audit.tsx)**: テーブルスクロール化

---

## 検証計画

1. **型チェック・ビルド・lint**:
   - `npx tsc --noEmit` (0 Error)
   - `npm run build` (成功)
   - `npm run lint` (0 Error)
2. **バックエンド自動テスト**: 全3スイート PASSED
3. **複数画面サイズでのブラウザ確認**:
   - スマホ (360x800, 390x844, 430x932)
   - タブレット (768x1024, 1024x768)
   - PC (1280x800, 1440x900)
   - 全画面でルートレベルの横スクロールがないこと、ハンバーガーメニュー・ドロワー・キーボード入力・モーダルが正常に動作することを確認
